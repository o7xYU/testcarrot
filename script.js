// script.js (v2.4 - 终极修复版)
(function () {
    if (document.getElementById('cip-carrot-button')) return;

    // --- 全局常量和状态 ---
    const MODULES_KEY = 'cip_modules_config_v2';
    const THEME_KEY = 'cip_theme_config_v1';
    const BTN_POS_KEY = 'cip_button_position_v4';
    const STICKER_DATA_KEY = 'cip_sticker_data_v2';

    let modules = [];
    let theme = {};
    let currentTabId = null;
    let stickerData = {};
    let selectedSticker = null;
    let currentActiveSubOptionId = 'plain';

    // --- 数据处理 ---
    function getDefaultTheme() {
        return {
            'panel-bg-color': 'rgba(255, 255, 255, 0.8)', 'border-color': 'rgba(255, 255, 255, 0.4)',
            'text-color': '#333333', 'accent-color': 'rgba(142, 166, 4, 0.7)',
            'active-bg-color': 'rgba(255, 127, 80, 0.3)', 'input-bg-color': 'rgba(255, 255, 255, 0.5)',
            'insert-btn-text-color': '#ffffff', 'insert-btn-hover-bg': '#e56a40',
        };
    }
    function loadTheme() { try { const saved = localStorage.getItem(THEME_KEY); theme = saved ? JSON.parse(saved) : getDefaultTheme(); } catch (e) { theme = getDefaultTheme(); } }
    function saveTheme() { localStorage.setItem(THEME_KEY, JSON.stringify(theme)); }
    function applyTheme() { for (const [key, value] of Object.entries(theme)) { document.documentElement.style.setProperty(`--cip-${key}`, value); } }
    function getDefaultModules() { return [{ id: "text", name: "文字信息", type: "text", deletable: false, subOptions: [{ id: "plain", name: "纯文本", format: "“{content}”" }, { id: "image", name: "图片", format: "“[{content}.jpg]”" }, { id: "video", name: "视频", format: "“[{content}.mp4]”" }, { id: "music", name: "音乐", format: "“[{content}.mp3]”" }, { id: "post", name: "帖子", format: "“[{content}.link]”" }] }, { id: "voice", name: "语音", type: "voice", deletable: false, format: "={duration}'|{message}=" }, { id: "cheat_mode", name: "作弊模式", type: "simple", deletable: true, format: "({content})" }, { id: "stickers", name: "表情包", type: "stickers", deletable: false, format: "!{desc}|{url}!" }]; }
    function loadModules() { const saved = localStorage.getItem(MODULES_KEY); try { const parsed = JSON.parse(saved); if (Array.isArray(parsed) && parsed.length > 0) modules = parsed; else throw new Error("Invalid modules data"); } catch (e) { modules = getDefaultModules(); saveModules(); } currentTabId = modules[0]?.id; }
    function saveModules() { localStorage.setItem(MODULES_KEY, JSON.stringify(modules)); }
    function loadStickerData() { const data = localStorage.getItem(STICKER_DATA_KEY); if (data) stickerData = JSON.parse(data); }
    function saveStickerData() { localStorage.setItem(STICKER_DATA_KEY, JSON.stringify(stickerData)); }

    // --- UI 创建 & 渲染 ---
    function createUI() {
        const create = (tag, id, className, html) => { const el = document.createElement(tag); if (id) el.id = id; if (className) el.className = className; if (html) el.innerHTML = html; return el; };
        const elements = {
            carrotButton: create('div', 'cip-carrot-button', null, '🥕'),
            inputPanel: create('div', 'cip-input-panel', 'cip-frosted-glass', `
                <nav id="cip-panel-tabs"></nav>
                <div id="cip-format-display"></div>
                <div id="cip-panel-content"></div>
                <div id="cip-panel-footer">
                    <div class="cip-footer-group">
                        <div id="cip-emoji-picker-btn" title="表情符号">😊</div>
                        <div id="cip-theme-btn" title="主题设置">👕</div>
                        <div id="cip-manage-btn" title="管理模块">⚙️</div>
                    </div>
                    <div class="cip-footer-actions">
                        <button id="cip-recall-button">撤回</button>
                        <button id="cip-insert-button">插 入</button>
                    </div>
                </div>`),
            emojiPicker: create('emoji-picker', 'cip-emoji-picker', 'cip-frosted-glass'),
            themeModal: create('div', 'cip-theme-modal', 'cip-modal-backdrop', `<div class="cip-modal-content cip-frosted-glass"><h3>主题颜色设置</h3><div id="cip-theme-list" class="cip-modal-body"></div><div class="cip-modal-footer"><button id="cip-reset-theme-btn" class="cip-modal-button cip-modal-button-secondary">恢复默认</button><button id="cip-close-theme-btn" class="cip-modal-button cip-modal-button-primary">关闭</button></div></div>`),
            manageModal: create('div', 'cip-manage-modal', 'cip-modal-backdrop', `<div class="cip-modal-content cip-frosted-glass"><h3>模块管理</h3><div class="cip-modal-body"><ul id="cip-module-list"></ul></div><div class="cip-modal-footer"><button id="cip-add-module-btn" class="cip-modal-button cip-modal-button-primary">添加新模块</button><button id="cip-close-manage-btn" class="cip-modal-button cip-modal-button-secondary">关闭</button></div></div>`),
            editModal: create('div', 'cip-edit-modal', 'cip-modal-backdrop', `<div class="cip-modal-content cip-frosted-glass"><h3 id="cip-edit-modal-title"></h3><div class="cip-modal-body cip-edit-form"><div class="form-group"><label for="cip-edit-name">名称</label><input type="text" id="cip-edit-name" class="cip-edit-modal-input"></div><div class="form-group"><label for="cip-edit-type">类型</label><select id="cip-edit-type" class="cip-edit-modal-select"><option value="simple">简单文本</option><option value="voice">语音</option></select></div><div class="form-group"><label for="cip-edit-format">格式</label><input type="text" id="cip-edit-format" class="cip-edit-modal-input"><p class="cip-format-help">可用变量: {content}, {duration}, {message}</p></div></div><div class="cip-modal-footer"><button id="cip-cancel-edit-btn" class="cip-modal-button cip-modal-button-secondary">取消</button><button id="cip-save-edit-btn" class="cip-modal-button cip-modal-button-primary">保存</button></div></div>`),
            addStickersModal: create('div', 'cip-add-stickers-modal', 'cip-modal-backdrop', `<div class="cip-modal-content cip-frosted-glass"><h3 id="cip-add-sticker-title"></h3><p>每行一个，格式为：<br><code>表情包描述:图片链接</code></p><textarea id="cip-new-stickers-input" class="cip-textarea"></textarea><div class="cip-modal-actions"><button id="cip-cancel-stickers-btn" class="cip-modal-button cip-modal-button-secondary">取消</button><button id="cip-save-stickers-btn" class="cip-modal-button cip-modal-button-primary">保存</button></div></div>`)
        };
        Object.values(elements).forEach(el => document.body.appendChild(el));
    }
    
    function renderApp() {
        const tabsContainer = getEl('cip-panel-tabs');
        const contentContainer = getEl('cip-panel-content');
        tabsContainer.innerHTML = ''; contentContainer.innerHTML = '';
        modules.forEach(module => {
            const tabButton = document.createElement('button');
            tabButton.className = 'cip-tab-button'; tabButton.textContent = module.name;
            tabButton.dataset.tabId = module.id;
            tabsContainer.appendChild(tabButton);
            contentContainer.appendChild(createContentPanel(module));
        });
        if (!modules.find(m => m.id === currentTabId)) currentTabId = modules[0]?.id;
        switchTab(currentTabId);
    }
    
    function createContentPanel(module) {
        const panel = document.createElement('div');
        panel.id = `cip-${module.id}-content`; panel.className = 'cip-content-section';
        switch(module.type) {
            case 'text':
                const subOptionsHtml = module.subOptions.map((opt, index) => `<button class="cip-sub-option-btn ${index === 0 ? 'active' : ''}" data-sub-id="${opt.id}">${opt.name}</button>`).join('');
                panel.innerHTML = `<div class="cip-sub-options-container">${subOptionsHtml}</div><textarea id="cip-main-input" class="cip-textarea" placeholder="在此输入文字..."></textarea>`; break;
            case 'voice': panel.innerHTML = `<input type="number" id="cip-voice-duration" placeholder="输入时长 (秒, 仅数字)"><textarea id="cip-voice-message" class="cip-textarea" placeholder="输入语音识别出的内容..."></textarea>`; break;
            case 'simple': case 'bunny': panel.innerHTML = `<textarea id="cip-${module.id}-input" class="cip-textarea" placeholder="在此输入..."></textarea>`; break;
            case 'stickers': panel.innerHTML = `<div id="cip-sticker-categories" class="cip-sub-options-container"><button id="cip-add-category-btn" class="cip-sub-option-btn">+</button></div><div id="cip-sticker-grid"></div>`; break;
        }
        return panel;
    }
    
    // --- 核心逻辑与事件监听 ---
    function switchTab(tabId){if(!tabId)return;currentTabId=tabId;const e=modules.find(e=>e.id===tabId);queryAllEl(".cip-tab-button").forEach(e=>e.classList.toggle("active",e.dataset.tabId===tabId)),queryAllEl(".cip-content-section").forEach(e=>e.classList.toggle("active",e.id===`cip-${tabId}-content`)),"stickers"===tabId&&renderStickerCategories(),e&&"text"===e.type&&(currentActiveSubOptionId=e.subOptions[0].id,getEl("cip-panel-content").querySelector(".cip-sub-option-btn")?.classList.add("active")),updateFormatDisplay()}
    function updateFormatDisplay(){const e=modules.find(e=>e.id===currentTabId);if(!e)return;let t="";switch(e.type){case"text":const o=e.subOptions.find(e=>e.id===currentActiveSubOptionId);t=o?o.format.replace("{content}","内容"):"";break;case"voice":t=e.format.replace("{duration}","数字").replace("{message}","内容");break;case"simple":case"bunny":t=e.format.replace("{content}","内容");break;case"stickers":t=e.format.replace("{desc}","描述").replace("{url}","链接");const i=getEl("cip-input-panel")?.querySelector(`.cip-sticker-category-btn[data-category="${currentStickerCategory}"]`);if(i){queryAllEl(".cip-category-action-icon").forEach(e=>e.remove());const t=document.createElement("i");t.textContent=" ➕",t.className="cip-category-action-icon",t.title="添加表情包",t.onclick=e=>{e.stopPropagation(),openAddStickersModal(currentStickerCategory)},i.appendChild(t);const o=document.createElement("i");o.textContent=" 🗑️",o.className="cip-category-action-icon cip-delete-category-btn",o.title="删除分类",o.onclick=e=>{e.stopPropagation(),confirm(`确定删除「${currentStickerCategory}」分类?`)&&(delete stickerData[currentStickerCategory],saveStickerData(),renderStickerCategories(),switchStickerCategory(Object.keys(stickerData)[0]||""))},i.appendChild(o)}}}getEl("cip-format-display").textContent=`格式: ${t}`}
    function insertIntoSillyTavern(e){const t=document.querySelector("#send_textarea");t?(t.value+=(t.value.trim()?"\n":"")+e,t.dispatchEvent(new Event("input",{bubbles:!0})),t.focus()):alert("未能找到SillyTavern的输入框！")}
    
    // Sticker and Modal logic
    let currentStickerCategory="";function renderStickerCategories(){const e=getEl("cip-sticker-categories");if(!e)return;e.innerHTML='<button id="cip-add-category-btn" class="cip-sub-option-btn">+</button>';const t=Object.keys(stickerData);t.forEach(o=>{const t=document.createElement("button");t.textContent=o,t.className="cip-sub-option-btn cip-sticker-category-btn",t.dataset.category=o,e.appendChild(t)}),switchStickerCategory(currentStickerCategory&&t.includes(currentStickerCategory)?currentStickerCategory:t[0])}
    function switchStickerCategory(e){currentStickerCategory=e||"";const t=getEl("cip-sticker-categories");t&&t.querySelectorAll(".cip-sticker-category-btn").forEach(t=>t.classList.toggle("active",t.dataset.category===e)),renderStickers(e),selectedSticker=null,updateFormatDisplay()}
    function renderStickers(e){const t=getEl("cip-sticker-grid");if(!t)return;if(t.innerHTML="",!e||!stickerData[e])return void(t.innerHTML='<div class="cip-sticker-placeholder">请先选择或添加一个分类...</div>');const o=stickerData[e];if(0===o.length)return void(t.innerHTML='<div class="cip-sticker-placeholder">这个分类还没有表情包...</div>');o.forEach((e)=>{const o=document.createElement("div");o.className="cip-sticker-wrapper";const i=document.createElement("img");i.src=e.url,i.title=e.desc,i.className="cip-sticker-item";const n=document.createElement("button");n.innerHTML="&times;",n.className="cip-delete-sticker-btn",n.title="删除这个表情包",o.appendChild(n),o.appendChild(i),t.appendChild(o)})}
    function openAddStickerCategoryModal(){const e=prompt("请输入新的表情包分类名称：");e&&!stickerData[e]&&(stickerData[e]=[],saveStickerData(),renderStickerCategories(),switchStickerCategory(e))}
    function openAddStickersModal(e){getEl("cip-add-sticker-title").textContent=`为「${e}」分类添加表情包`,getEl("cip-new-stickers-input").value="",getEl("cip-add-stickers-modal").dataset.currentCategory=e,getEl("cip-add-stickers-modal").classList.add("visible")}

    function setupEventListeners() {
        const get = getEl;
        get('cip-input-panel').addEventListener('click', e => {
            const target = e.target;
            if (target.matches('.cip-tab-button')) switchTab(target.dataset.tabId);
            if (target.matches('.cip-sub-option-btn') && target.closest('#cip-text-content')) { target.parentElement.querySelector('.active')?.classList.remove('active'); target.classList.add('active'); currentActiveSubOptionId = target.dataset.subId; updateFormatDisplay(); }
            if (target.matches('#cip-add-category-btn')) openAddStickerCategoryModal();
            if (target.matches('.cip-sticker-category-btn')) switchStickerCategory(target.dataset.category);
            if (target.matches('.cip-sticker-item')) { get('cip-sticker-grid').querySelector('.selected')?.classList.remove('selected'); target.classList.add('selected'); const desc = target.title; const category = get('cip-sticker-categories').querySelector('.active')?.dataset.category; if (category) selectedSticker = stickerData[category]?.find(s => s.desc === desc); }
            if (target.matches('.cip-delete-sticker-btn')) { const img = target.closest('.cip-sticker-wrapper').querySelector('img'); if(!img) return; const desc = img.title; const category = get('cip-sticker-categories').querySelector('.active')?.dataset.category; if(confirm(`确定删除表情「${desc}」?`)) { const index = stickerData[category]?.findIndex(s => s.desc === desc); if (index > -1) { stickerData[category].splice(index, 1); saveStickerData(); renderStickers(category); } } }
            if (target.matches('#cip-recall-button')) insertIntoSillyTavern('--');
            if (target.matches('#cip-manage-btn')) get('cip-manage-modal').classList.add('visible');
            if (target.matches('#cip-theme-btn')) openThemeModal();
            if (target.matches('#cip-emoji-picker-btn')) { const emojiPicker = get('cip-emoji-picker'); const isVisible = emojiPicker.style.display === 'block'; if (isVisible) emojiPicker.style.display = 'none'; else { const btnRect = target.getBoundingClientRect(); let top = btnRect.top - 350 - 10; if (top < 10) top = btnRect.bottom + 10; emojiPicker.style.top = `${top}px`; emojiPicker.style.left = `${btnRect.left}px`; emojiPicker.style.display = 'block'; } }
            if (target.matches('#cip-insert-button')) {
                const module = modules.find(m => m.id === currentTabId); if (!module) return; let formattedText = '', inputToClear = null, durationInput = null;
                switch(module.type) {
                    case 'text': const subOpt = module.subOptions.find(so => so.id === currentActiveSubOptionId); const mainInput = get('cip-main-input'); if (mainInput && mainInput.value.trim() && subOpt) { formattedText = subOpt.format.replace('{content}', mainInput.value); inputToClear = mainInput; } break;
                    case 'voice': durationInput = get('cip-voice-duration'); const messageInput = get('cip-voice-message'); if (durationInput && messageInput && durationInput.value.trim() && messageInput.value.trim()) { formattedText = module.format.replace('{duration}', durationInput.value).replace('{message}', messageInput.value); inputToClear = messageInput; } break;
                    case 'simple': case 'bunny': const simpleInput = get(`cip-${module.id}-input`); if (simpleInput && simpleInput.value.trim()) { formattedText = module.format.replace('{content}', simpleInput.value); inputToClear = simpleInput; } break;
                    case 'stickers': if (selectedSticker) { formattedText = module.format.replace('{desc}', selectedSticker.desc).replace('{url}', selectedSticker.url); } break;
                }
                if (formattedText) { insertIntoSillyTavern(formattedText); if(inputToClear) inputToClear.value = ''; if(durationInput) durationInput.value = ''; }
            }
        });
        get('cip-manage-modal').addEventListener('click', e => { const target = e.target.closest('button'); if(!target) return; const id = target.dataset.id; if (target.matches('.cip-edit-btn')) openEditModal(id); if (target.matches('.cip-delete-btn')) { if (confirm('你确定要删除这个模块吗?')) { modules = modules.filter(m => m.id !== id); if (currentTabId === id) currentTabId = modules[0]?.id; saveModules(); renderApp(); openManageModal(); } } if (target.matches('#cip-add-module-btn')) openEditModal(); if (target.matches('#cip-close-manage-btn')) get('cip-manage-modal').classList.remove('visible'); });
        function openManageModal(){const t=getEl("cip-module-list");t.innerHTML="",modules.forEach(e=>{const o=document.createElement("li");o.className="cip-module-item",o.innerHTML=`<span class="cip-module-item-name">${e.name}</span><div class="cip-module-item-actions"><button class="cip-edit-btn" data-id="${e.id}" title="编辑">✏️</button>${e.deletable?`<button class="cip-delete-btn" data-id="${e.id}" title="删除">🗑️</button>`:""}</div>`,t.appendChild(o)})}
        function openEditModal(t=null){const e=modules.find(e=>e.id===t),o=getEl("cip-edit-modal-title"),i=getEl("cip-edit-name"),d=getEl("cip-edit-type"),l=getEl("cip-edit-format"),n=getEl("cip-save-edit-btn");e?(o.textContent=`编辑模块: ${e.name}`,i.value=e.name,d.value=e.type,d.disabled=!0,l.value=e.format||"",n.dataset.editingId=t):(o.textContent="添加新模块",i.value="",d.value="simple",d.disabled=!1,l.value="({content})",delete n.dataset.editingId),get('cip-manage-modal').classList.remove("visible"),get('cip-edit-modal').classList.add("visible")}
        get('cip-edit-modal').addEventListener('click', e => { if (e.target.matches('#cip-cancel-edit-btn')) get('cip-edit-modal').classList.remove('visible'); if (e.target.matches('#cip-save-edit-btn')) { const id = e.target.dataset.editingId, name = get('cip-edit-name').value.trim(), type = get('cip-edit-type').value, format = get('cip-edit-format').value.trim(); if (!name || !format) return alert('名称和格式不能为空！'); if (id) { const module = modules.find(m => m.id === id); if (module) { module.name = name; if (module.format !== undefined) module.format = format; } } else { modules.push({ id: `custom_${Date.now()}`, name, type, format, deletable: true }); } saveModules(); renderApp(); get('cip-edit-modal').classList.remove('visible'); }});
        get('cip-add-stickers-modal').addEventListener('click', e => { if (e.target.matches('#cip-cancel-stickers-btn')) get('cip-add-stickers-modal').classList.remove('visible'); if (e.target.matches('#cip-save-stickers-btn')) { const category = get('cip-add-stickers-modal').dataset.currentCategory, text = get('cip-new-stickers-input').value.trim(); if (!category || !text || !stickerData[category]) return; let addedCount = 0; text.split('\n').forEach(line => { const parts = line.split(':'); if (parts.length >= 2) { const desc = parts[0].trim(), url = parts.slice(1).join(':').trim(); if (desc && url) { stickerData[category].push({ desc, url }); addedCount++; } }}); if (addedCount > 0) { saveStickerData(); if (currentStickerCategory === category) renderStickers(category); get('cip-add-stickers-modal').classList.remove('visible'); } else { alert('未能解析任何有效的表情包信息。'); } }});
        
        get('cip-theme-modal').addEventListener('input', e => { if(e.target.matches('input')) { const key = e.target.dataset.key; const value = e.target.value; theme[key] = value; applyTheme(); saveTheme(); const textInput = e.currentTarget.querySelector(`input[type="text"][data-key="${key}"]`); const colorInput = e.currentTarget.querySelector(`input[type="color"][data-key="${key}"]`); if(e.target.type === 'color') textInput.value = value; if(e.target.type === 'text') { try { colorInput.value = value; } catch(err) { /* ignore invalid text input */ } } }});
        get('cip-theme-modal').addEventListener('click', e => { if (e.target.matches('#cip-close-theme-btn')) get('cip-theme-modal').classList.remove('visible'); if (e.target.matches('#cip-reset-theme-btn')) { if (confirm('确定要恢复所有颜色为默认设置吗？')) { theme = getDefaultTheme(); saveTheme(); applyTheme(); openThemeModal(); } }});
        
        function dragHandler(e){let t=!0;"touchstart"===e.type&&e.preventDefault();const o=getEl("cip-carrot-button").getBoundingClientRect(),i="mouse"===e.type.substring(0,5)?e.clientX:e.touches[0].clientX,d="mouse"===e.type.substring(0,5)?e.clientY:e.touches[0].clientY,l=i-o.left,n=d-o.top;const c=e=>{t=!1,getEl("cip-carrot-button").classList.add("is-dragging");let o="mouse"===e.type.substring(0,5)?e.clientX:e.touches[0].clientX,i="mouse"===e.type.substring(0,5)?e.clientY:e.touches[0].clientY,d=o-l,s=i-n;d=Math.max(0,Math.min(d,window.innerWidth-getEl("cip-carrot-button").offsetWidth)),s=Math.max(0,Math.min(s,window.innerHeight-getEl("cip-carrot-button").offsetHeight)),getEl("cip-carrot-button").style.position="fixed",getEl("cip-carrot-button").style.left=`${d}px`,getEl("cip-carrot-button").style.top=`${s}px`},s=()=>{document.removeEventListener("mousemove",c),document.removeEventListener("mouseup",s),document.removeEventListener("touchmove",c),document.removeEventListener("touchend",s),getEl("cip-carrot-button").classList.remove("is-dragging"),t?getEl("cip-input-panel").classList.contains("active")?hidePanel():showPanel():localStorage.setItem(BTN_POS_KEY,JSON.stringify({top:getEl("cip-carrot-button").style.top,left:getEl("cip-carrot-button").style.left}))};document.addEventListener("mousemove",c),document.addEventListener("mouseup",s),document.addEventListener("touchmove",c,{passive:!1}),document.addEventListener("touchend",s)}
        function hidePanel(){getEl("cip-input-panel").classList.remove("active")}function showPanel(){const e=getEl("cip-carrot-button").getBoundingClientRect(),t=getEl("cip-input-panel").offsetHeight||380;let o=e.top-t-10;o<10&&(o=e.bottom+10);let i=e.left+e.width/2-getEl("cip-input-panel").offsetWidth/2;i=Math.max(10,Math.min(i,window.innerWidth-getEl("cip-input-panel").offsetWidth-10)),getEl("cip-input-panel").style.top=`${o}px`,getEl("cip-input-panel").style.left=`${i}px`,getEl("cip-input-panel").classList.add("active")}
        getEl('cip-carrot-button').addEventListener('mousedown', dragHandler); getEl('cip-carrot-button').addEventListener('touchstart', dragHandler, { passive: false });
        document.addEventListener('click', e => { if (getEl('cip-input-panel').classList.contains('active') && !getEl('cip-input-panel').contains(e.target) && !getEl('cip-carrot-button').contains(e.target)) hidePanel(); if (getEl('cip-emoji-picker').style.display === 'block' && !getEl('cip-emoji-picker').contains(e.target) && !getEl('cip-emoji-picker-btn').contains(e.target)) { getEl('cip-emoji-picker').style.display = 'none'; } if (get('cip-manage-modal').classList.contains('visible') && !get('cip-manage-modal').querySelector('.cip-modal-content').contains(e.target)) get('cip-manage-modal').classList.remove('visible'); if (get('cip-edit-modal').classList.contains('visible') && !get('cip-edit-modal').querySelector('.cip-modal-content').contains(e.target)) get('cip-edit-modal').classList.remove('visible'); if (get('cip-add-stickers-modal').classList.contains('visible') && !get('cip-add-stickers-modal').querySelector('.cip-modal-content').contains(e.target)) get('cip-add-stickers-modal').classList.remove('visible'); if (get('cip-theme-modal').classList.contains('visible') && !get('cip-theme-modal').querySelector('.cip-modal-content').contains(e.target)) get('cip-theme-modal').classList.remove('visible'); });
        get('cip-emoji-picker').addEventListener('emoji-click', event => { const emoji = event.detail.unicode; const module = modules.find(m => m.id === currentTabId); if (!module) return; let target; switch(module.type) { case 'text': target = get('cip-main-input'); break; case 'voice': target = get('cip-voice-message'); break; case 'simple': case 'bunny': target = get(`cip-${module.id}-input`); break; } if (target) { const { selectionStart, selectionEnd, value } = target; target.value = value.substring(0, selectionStart) + emoji + value.substring(selectionEnd); target.focus(); target.selectionEnd = selectionStart + emoji.length; } get('cip-emoji-picker').style.display = 'none'; });
    }

    function init() {
        loadModules(); loadTheme();
        createUI();
        applyTheme(); loadStickerData(); loadButtonPosition();
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
