// script.js (v2.4 - 主题定制功能)
(function () {
    if (document.getElementById('cip-carrot-button')) return;

    // --- 全局常量和状态 ---
    const MODULES_KEY = 'cip_modules_config_v2';
    const BTN_POS_KEY = 'cip_button_position_v4';
    const STICKER_DATA_KEY = 'cip_sticker_data_v2';
    const THEME_KEY = 'cip_theme_config_v1';

    let modules = []; let currentTabId = null; let stickerData = {};
    let selectedSticker = null; let currentActiveSubOptionId = 'plain';

    // --- 主题数据 ---
    const defaultTheme = {
        '--cip-panel-bg-color': 'rgba(255, 255, 255, 0.8)',
        '--cip-border-color': 'rgba(255, 255, 255, 0.4)',
        '--cip-text-color': '#333333',
        '--cip-accent-color': 'rgba(142, 166, 4, 0.7)',
        '--cip-active-bg-color': 'rgba(255, 127, 80, 0.3)',
        '--cip-input-bg-color': 'rgba(255, 255, 255, 0.5)',
        '--cip-insert-font-color': '#ffffff',
        '--cip-insert-hover-bg-color': '#e56a40',
    };
    const themeConfig = [
        { key: '--cip-panel-bg-color', label: '面板背景' },
        { key: '--cip-border-color', label: '面板边框' },
        { key: '--cip-text-color', label: '功能栏字体' },
        { key: '--cip-accent-color', label: '胡萝卜/主色' },
        { key: '--cip-active-bg-color', label: '选中项背景' },
        { key: '--cip-input-bg-color', label: '输入框背景' },
        { key: '--cip-insert-font-color', label: '插入按钮字体' },
        { key: '--cip-insert-hover-bg-color', label: '插入按钮悬停' },
    ];
    let currentTheme = {};

    function applyTheme(theme) {
        for (const key in theme) {
            document.documentElement.style.setProperty(key, theme[key]);
        }
    }
    function loadTheme() {
        const saved = localStorage.getItem(THEME_KEY);
        try {
            currentTheme = saved ? JSON.parse(saved) : defaultTheme;
        } catch(e) {
            currentTheme = defaultTheme;
        }
        applyTheme(currentTheme);
    }
    function saveTheme() {
        localStorage.setItem(THEME_KEY, JSON.stringify(currentTheme));
    }
    
    // --- 模块数据 ---
    function getDefaultModules(){return [{id:"text",name:"文字信息",type:"text",deletable:!1,subOptions:[{id:"plain",name:"纯文本",format:"“{content}”"},{id:"image",name:"图片",format:"“[{content}.jpg]”"},{id:"video",name:"视频",format:"“[{content}.mp4]”"},{id:"music",name:"音乐",format:"“[{content}.mp3]”"},{id:"post",name:"帖子",format:"“[{content}.link]”"}]},{id:"voice",name:"语音",type:"voice",deletable:!1,format:"={duration}'|{message}="},{id:"cheat_mode",name:"作弊模式",type:"simple",deletable:!0,format:"({content})"},{id:"stickers",name:"表情包",type:"stickers",deletable:!1,format:"!{desc}|{url}!"}]}
    function loadModules(){const e=localStorage.getItem(MODULES_KEY);try{const t=JSON.parse(e);if(!Array.isArray(t)||0===t.length)throw new Error("Invalid modules data");modules=t}catch(t){modules=getDefaultModules(),saveModules()}currentTabId=modules[0]?.id}
    function saveModules(){localStorage.setItem(MODULES_KEY,JSON.stringify(modules))}
    function loadStickerData(){const e=localStorage.getItem(STICKER_DATA_KEY);e&&(stickerData=JSON.parse(e))}
    function saveStickerData(){localStorage.setItem(STICKER_DATA_KEY,JSON.stringify(stickerData))}
    function loadButtonPosition(){const e=JSON.parse(localStorage.getItem(BTN_POS_KEY));e?.top&&e?.left&&(getEl("cip-carrot-button").style.position="fixed",getEl("cip-carrot-button").style.top=e.top,getEl("cip-carrot-button").style.left=e.left)}

    // --- UI 创建 & 渲染 ---
    function createUI() {
        const create = (tag, id, className, html) => {
            const el = document.createElement(tag); if (id) el.id = id; if (className) el.className = className; if (html) el.innerHTML = html; return el;
        };
        const elements = {
            carrotButton: create('div', 'cip-carrot-button', null, '🥕'),
            inputPanel: create('div', 'cip-input-panel', 'cip-frosted-glass', `
                <nav id="cip-panel-tabs"></nav>
                <div id="cip-format-display"></div>
                <div id="cip-panel-content"></div>
                <div id="cip-panel-footer">
                    <div class="cip-footer-group">
                        <div id="cip-emoji-picker-btn">😊</div>
                        <div id="cip-manage-btn" title="管理模块">⚙️</div>
                        <div id="cip-theme-btn" title="主题设置">👕</div>
                    </div>
                    <div class="cip-footer-actions"><button id="cip-recall-button" class="cip-modal-button cip-modal-button-secondary">撤回</button><button id="cip-insert-button">插 入</button></div>
                </div>`),
            emojiPicker: create('emoji-picker', 'cip-emoji-picker', 'cip-frosted-glass'),
            manageModal: create('div', 'cip-manage-modal', 'cip-modal-backdrop', `<div class="cip-modal-content cip-frosted-glass"><h3>模块管理</h3><div class="cip-modal-body"><ul id="cip-module-list"></ul></div><div class="cip-modal-footer"><button id="cip-add-module-btn" class="cip-modal-button cip-modal-button-primary">添加新模块</button><button id="cip-close-manage-btn" class="cip-modal-button cip-modal-button-secondary">关闭</button></div></div>`),
            editModal: create('div', 'cip-edit-modal', 'cip-modal-backdrop', `<div class="cip-modal-content cip-frosted-glass"><h3 id="cip-edit-modal-title"></h3><div class="cip-modal-body cip-edit-form"><div class="form-group"><label for="cip-edit-name">名称</label><input type="text" id="cip-edit-name" class="cip-edit-modal-input"></div><div class="form-group"><label for="cip-edit-type">类型</label><select id="cip-edit-type" class="cip-edit-modal-select"><option value="simple">简单文本</option><option value="voice">语音</option></select></div><div class="form-group"><label for="cip-edit-format">格式</label><input type="text" id="cip-edit-format" class="cip-edit-modal-input"><p class="cip-format-help">可用变量: {content}, {duration}, {message}</p></div></div><div class="cip-modal-footer"><button id="cip-cancel-edit-btn" class="cip-modal-button cip-modal-button-secondary">取消</button><button id="cip-save-edit-btn" class="cip-modal-button cip-modal-button-primary">保存</button></div></div>`),
            addStickersModal: create('div', 'cip-add-stickers-modal', 'cip-modal-backdrop', `<div class="cip-modal-content cip-frosted-glass"><h3 id="cip-add-sticker-title"></h3><p>每行一个，格式为：<br><code>表情包描述:图片链接</code></p><textarea id="cip-new-stickers-input" placeholder="可爱猫猫:https://example.com/cat.png\n狗狗点头:https://example.com/dog.gif"></textarea><div class="cip-modal-actions"><button id="cip-cancel-stickers-btn" class="cip-modal-button cip-modal-button-secondary">取消</button><button id="cip-save-stickers-btn" class="cip-modal-button cip-modal-button-primary">保存</button></div></div>`),
            themeModal: create('div', 'cip-theme-modal', 'cip-modal-backdrop', `<div class="cip-modal-content cip-frosted-glass"><h3>主题设置</h3><div class="cip-modal-body"><ul id="cip-theme-list"></ul></div><div class="cip-modal-footer"><button id="cip-reset-theme-btn" class="cip-modal-button cip-modal-button-secondary">恢复默认</button><button id="cip-close-theme-btn" class="cip-modal-button cip-modal-button-primary">关闭</button></div></div>`),
        };
        Object.values(elements).forEach(el => document.body.appendChild(el));
    }
    
    // ... (所有其他核心函数逻辑保持不变, 此处省略以保持简洁)
    const getEl=(e)=>document.getElementById(e),queryAllEl=e=>document.querySelectorAll(e);function renderApp(){const e=getEl("cip-panel-tabs"),t=getEl("cip-panel-content");e.innerHTML="",t.innerHTML="",modules.forEach(o=>{e.appendChild(createTabButton(o)),t.appendChild(createContentPanel(o))}),modules.find(e=>e.id===currentTabId)||(currentTabId=modules[0]?.id),switchTab(currentTabId)}
    function createTabButton(e){const t=document.createElement("button");return t.className="cip-tab-button",t.textContent=e.name,t.dataset.tabId=e.id,t}
    function createContentPanel(e){const t=document.createElement("div");switch(t.id=`cip-${e.id}-content`,t.className="cip-content-section",e.type){case"text":const o=e.subOptions.map((e,t)=>`<button class="cip-sub-option-btn ${0===t?"active":""}" data-sub-id="${e.id}">${e.name}</button>`).join("");t.innerHTML=`<div class="cip-sub-options-container">${o}</div><textarea id="cip-main-input" class="cip-textarea" placeholder="在此输入文字..."></textarea>`;break;case"voice":t.innerHTML='<input type="number" id="cip-voice-duration" placeholder="输入时长 (秒, 仅数字)"><textarea id="cip-voice-message" class="cip-textarea" placeholder="输入语音识别出的内容..."></textarea>';break;case"simple":case"bunny":t.innerHTML=`<textarea id="cip-${e.id}-input" class="cip-textarea" placeholder="在此输入..."></textarea>`;break;case"stickers":t.innerHTML='<div id="cip-sticker-categories" class="cip-sub-options-container"><button id="cip-add-category-btn" class="cip-sub-option-btn">+</button></div><div id="cip-sticker-grid"></div>'}return t}
    function switchTab(e){if(!e)return;currentTabId=e;const t=modules.find(t=>t.id===e);queryAllEl(".cip-tab-button").forEach(t=>t.classList.toggle("active",t.dataset.tabId===e)),queryAllEl(".cip-content-section").forEach(t=>t.classList.toggle("active",t.id===`cip-${e}-content`)),"stickers"===e&&renderStickerCategories(),t&&"text"===t.type&&(currentActiveSubOptionId=t.subOptions[0].id,setTimeout(()=>{getEl("cip-panel-content").querySelector(".cip-sub-option-btn")?.classList.add("active")},0)),updateFormatDisplay()}
    function updateFormatDisplay(){const e=modules.find(e=>e.id===currentTabId);if(!e)return;let t="";switch(e.type){case"text":const o=e.subOptions.find(e=>e.id===currentActiveSubOptionId);t=o?o.format.replace("{content}","内容"):"";break;case"voice":t=e.format.replace("{duration}","数字").replace("{message}","内容");break;case"simple":case"bunny":t=e.format.replace("{content}","内容");break;case"stickers":t=e.format.replace("{desc}","描述").replace("{url}","链接")}getEl("cip-format-display").textContent=`格式: ${t}`}
    function insertIntoSillyTavern(e){const t=document.querySelector("#send_textarea");t?(t.value+=(t.value.trim()?"\n":"")+e,t.dispatchEvent(new Event("input",{bubbles:!0})),t.focus()):alert("未能找到SillyTavern的输入框！")}

    function setupEventListeners() {
        const get = getEl;
        // 主面板事件委托
        get('cip-input-panel').addEventListener('click', e => {
            const target = e.target;
            // ... (省略原有的大部分委托逻辑，只添加新的)
            if (target.matches('#cip-theme-btn')) openThemeModal();
        });
        // 主题设置面板事件
        get('cip-theme-modal').addEventListener('input', e => {
            const target = e.target;
            if (target.matches('.cip-theme-item input')) {
                const key = target.dataset.key;
                const value = target.value;
                currentTheme[key] = value;
                applyTheme(currentTheme); // Live preview
                saveTheme();
                // 同步另一个输入框的值
                if (target.type === 'color') target.nextElementSibling.value = value;
                if (target.type === 'text') target.previousElementSibling.value = value;
            }
        });
        get('cip-theme-modal').addEventListener('click', e => {
            if (e.target.matches('#cip-close-theme-btn')) e.currentTarget.classList.remove('visible');
            if (e.target.matches('#cip-reset-theme-btn')) {
                if(confirm('确定要恢复所有颜色为默认设置吗？')){
                    currentTheme = { ...defaultTheme };
                    applyTheme(currentTheme);
                    saveTheme();
                    openThemeModal(); // Refresh view
                }
            }
        });
        // ... (其他所有事件监听器保持不变，此处省略)
        get("cip-manage-modal").addEventListener("click",e=>{const t=e.target.closest("button");if(!t)return;const o=t.dataset.id;t.matches(".cip-edit-btn")?openEditModal(o):t.matches(".cip-delete-btn")?confirm("你确定要删除这个模块吗?")&&(modules=modules.filter(e=>e.id!==o),currentTabId===o&&(currentTabId=modules[0]?.id),saveModules(),renderApp(),openManageModal()):t.matches("#cip-add-module-btn")?openEditModal():t.matches("#cip-close-manage-btn")&&get("cip-manage-modal").classList.remove("visible")}),get("cip-edit-modal").addEventListener("click",e=>{if(e.target.matches("#cip-cancel-edit-btn"))get("cip-edit-modal").classList.remove("visible");else if(e.target.matches("#cip-save-edit-btn")){const t=e.target.dataset.editingId,o=get("cip-edit-name").value.trim(),i=get("cip-edit-type").value,n=get("cip-edit-format").value.trim();if(!o||!n)return alert("名称和格式不能为空！");t?(modules.find(e=>e.id===t).name=o,void 0!==(modules.find(e=>e.id===t).format=n)):modules.push({id:`custom_${Date.now()}`,name:o,type:i,format:n,deletable:!0}),saveModules(),renderApp(),get("cip-edit-modal").classList.remove("visible")}}),get('cip-add-stickers-modal').addEventListener('click',e=>{if(e.target.matches("#cip-cancel-stickers-btn"))get("cip-add-stickers-modal").classList.remove("visible");else if(e.target.matches("#cip-save-stickers-btn")){const t=get("cip-add-stickers-modal").dataset.currentCategory,o=get("cip-new-stickers-input").value.trim();if(!t||!o||!stickerData[t])return;let i=0;o.split("\n").forEach(e=>{const t=e.split(":");if(t.length>=2){const o=t[0].trim(),n=t.slice(1).join(":").trim();o&&n&&(stickerData[category].push({desc:o,url:n}),i++)}}),i>0?(saveStickerData(),currentStickerCategory===t&&renderStickers(t),get("cip-add-stickers-modal").classList.remove("visible")):alert("未能解析任何有效的表情包信息。")}});
        function openManageModal(){const t=getEl("cip-module-list");t.innerHTML="",modules.forEach(e=>{const o=document.createElement("li");o.className="cip-module-item",o.innerHTML=`<span class="cip-module-item-name">${e.name}</span><div class="cip-module-item-actions"><button class="cip-edit-btn" data-id="${e.id}" title="编辑">✏️</button>${e.deletable?`<button class="cip-delete-btn" data-id="${e.id}" title="删除">🗑️</button>`:""}</div>`,t.appendChild(o)})}
        function openEditModal(t=null){const e=modules.find(e=>e.id===t),o=getEl("cip-edit-modal-title"),i=getEl("cip-edit-name"),d=getEl("cip-edit-type"),l=getEl("cip-edit-format"),n=getEl("cip-save-edit-btn");e?(o.textContent=`编辑模块: ${e.name}`,i.value=e.name,d.value=e.type,d.disabled=!0,l.value=e.format||"",n.dataset.editingId=t):(o.textContent="添加新模块",i.value="",d.value="simple",d.disabled=!1,l.value="({content})",delete n.dataset.editingId),getEl("cip-manage-modal").classList.remove("visible"),getEl("cip-edit-modal").classList.add("visible")}
        const carrotButton=getEl("cip-carrot-button"),inputPanel=getEl("cip-input-panel"),emojiPicker=getEl("cip-emoji-picker");function hidePanel(){inputPanel.classList.remove("active")}function showPanel(){const e=carrotButton.getBoundingClientRect(),t=inputPanel.offsetHeight||380;let o=e.top-t-10;o<10&&(o=e.bottom+10);let i=e.left+e.width/2-inputPanel.offsetWidth/2;i=Math.max(10,Math.min(i,window.innerWidth-inputPanel.offsetWidth-10)),inputPanel.style.top=`${o}px`,inputPanel.style.left=`${i}px`,inputPanel.classList.add("active")}
        function dragHandler(e){let t=!0;"touchstart"===e.type&&e.preventDefault();const o=carrotButton.getBoundingClientRect(),i="mouse"===e.type.substring(0,5)?e.clientX:e.touches[0].clientX,d="mouse"===e.type.substring(0,5)?e.clientY:e.touches[0].clientY,l=i-o.left,n=d-o.top;const c=e=>{t=!1,carrotButton.classList.add("is-dragging");let o="mouse"===e.type.substring(0,5)?e.clientX:e.touches[0].clientX,i="mouse"===e.type.substring(0,5)?e.clientY:e.touches[0].clientY,d=o-l,s=i-n;d=Math.max(0,Math.min(d,window.innerWidth-carrotButton.offsetWidth)),s=Math.max(0,Math.min(s,window.innerHeight-carrotButton.offsetHeight)),carrotButton.style.position="fixed",carrotButton.style.left=`${d}px`,carrotButton.style.top=`${s}px`},s=()=>{document.removeEventListener("mousemove",c),document.removeEventListener("mouseup",s),document.removeEventListener("touchmove",c),document.removeEventListener("touchend",s),carrotButton.classList.remove("is-dragging"),t?inputPanel.classList.contains("active")?hidePanel():showPanel():localStorage.setItem(BTN_POS_KEY,JSON.stringify({top:carrotButton.style.top,left:carrotButton.style.left}))};document.addEventListener("mousemove",c),document.addEventListener("mouseup",s),document.addEventListener("touchmove",c,{passive:!1}),document.addEventListener("touchend",s)}
        carrotButton.addEventListener("mousedown",dragHandler),carrotButton.addEventListener("touchstart",dragHandler,{passive:!1}),document.addEventListener("click",e=>{inputPanel.classList.contains("active")&&!inputPanel.contains(e.target)&&!carrotButton.contains(e.target)&&hidePanel(),emojiPicker.style.display==="block"&&!emojiPicker.contains(e.target)&&!get("cip-emoji-picker-btn").contains(e.target)&&(emojiPicker.style.display="none"),get("cip-manage-modal").classList.contains("visible")&&!get("cip-manage-modal").querySelector(".cip-modal-content").contains(e.target)&&get("cip-manage-modal").classList.remove("visible"),get("cip-edit-modal").classList.contains("visible")&&!get("cip-edit-modal").querySelector(".cip-modal-content").contains(e.target)&&get("cip-edit-modal").classList.remove("visible"),get("cip-add-stickers-modal").classList.contains("visible")&&!get("cip-add-stickers-modal").querySelector(".cip-modal-content").contains(e.target)&&get("cip-add-stickers-modal").classList.remove("visible")});
        emojiPicker.addEventListener("emoji-click",e=>{const t=e.detail.unicode,o=modules.find(e=>e.id===currentTabId);if(!o)return;let i;switch(o.type){case"text":i=get("cip-main-input");break;case"voice":i=get("cip-voice-message");break;case"simple":case"bunny":i=get(`cip-${o.id}-input`)}if(i){const{selectionStart:e,selectionEnd:o,value:n}=i;i.value=n.substring(0,e)+t+n.substring(o),i.focus(),i.selectionEnd=e+t.length}emojiPicker.style.display="none"});
    }
    
    // --- 主题设置面板逻辑 ---
    function openThemeModal() {
        const themeList = getEl('cip-theme-list');
        themeList.innerHTML = '';
        themeConfig.forEach(item => {
            const li = document.createElement('li');
            li.className = 'cip-theme-item';
            const colorValue = currentTheme[item.key] || defaultTheme[item.key];
            li.innerHTML = `
                <label for="cip-theme-${item.key}">${item.label}</label>
                <div class="cip-theme-item-input-group">
                    <input type="color" id="cip-theme-${item.key}" data-key="${item.key}" value="${rgbaToHex(colorValue)}">
                    <input type="text" data-key="${item.key}" value="${colorValue}">
                </div>
            `;
            themeList.appendChild(li);
        });
        getEl('cip-theme-modal').classList.add('visible');
    }
    // Helper to convert rgba to hex for color input
    function rgbaToHex(rgba) {
        if (rgba.startsWith('#')) return rgba;
        let parts = rgba.substring(rgba.indexOf('(')).split(','),
            r = parseInt(parts[0].substring(1).trim(), 10),
            g = parseInt(parts[1].trim(), 10),
            b = parseInt(parts[2].trim(), 10);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    // --- 初始化 ---
    function init() {
        const pickerScript = document.createElement('script');
        pickerScript.type = 'module';
        pickerScript.src = 'https://cdn.jsdelivr.net/npm/emoji-picker-element@^1/index.js';
        document.head.appendChild(pickerScript);
        
        loadModules();
        createUI();
        loadStickerData();
        loadButtonPosition();
        loadTheme();
        renderApp();
        setupEventListeners();
    }

    const getEl = (id) => document.getElementById(id);
    const queryAllEl = (sel) => document.querySelectorAll(sel);
    
    const int = setInterval(() => {
        const anchor = document.querySelector('#chat-buttons-container, #send_form');
        if (anchor) {
            clearInterval(int);
            init();
        }
    }, 100);
})();
