// script.js (v2.2 - 修复配色名称输入及添加取色板)
(function () {
  if (document.getElementById('cip-carrot-button')) return;

  // --- 动态加载Emoji Picker库 ---
  const pickerScript = document.createElement('script');
  pickerScript.type = 'module';
  pickerScript.src = 'https://cdn.jsdelivr.net/npm/emoji-picker-element@^1/index.js';
  document.head.appendChild(pickerScript);

  // --- 1. 创建所有UI元素 (修改颜色设置面板为取色板) ---
  function createUI() {
    const create = (tag, id, className, html) => {
      const el = document.createElement(tag);
      if (id) el.id = id;
      if (className) el.className = className;
      if (html) el.innerHTML = html;
      return el;
    };
    const carrotButton = create('div', 'cip-carrot-button', null, '🥕');
    carrotButton.title = '胡萝卜快捷输入';

    const inputPanel = create(
      'div',
      'cip-input-panel',
      'cip-frosted-glass',
      `
            <nav id="cip-panel-tabs">
                <button class="cip-tab-button active" data-tab="text">文字信息</button>
                <button class="cip-tab-button" data-tab="voice">语音</button>
                <button class="cip-tab-button" data-tab="bunny">BUNNY</button>
                <button class="cip-tab-button" data-tab="stickers">表情包</button>
            </nav>
            <div id="cip-format-display"></div>
            <div id="cip-panel-content">
                <div id="cip-text-content" class="cip-content-section">
                    <div class="cip-sub-options-container">
                        <button class="cip-sub-option-btn active" data-type="plain">纯文本</button>
                        <button class="cip-sub-option-btn" data-type="image">图片</button>
                        <button class="cip-sub-option-btn" data-type="video">视频</button>
                        <button class="cip-sub-option-btn" data-type="music">音乐</button>
                        <button class="cip-sub-option-btn" data-type="post">帖子</button>
                    </div>
                    <textarea id="cip-main-input" placeholder="在此输入文字..."></textarea>
                </div>
                <div id="cip-voice-content" class="cip-content-section">
                    <input type="number" id="cip-voice-duration" placeholder="输入时长 (秒, 仅数字)">
                    <textarea id="cip-voice-message" placeholder="输入语音识别出的内容..."></textarea>
                </div>
                <div id="cip-bunny-content" class="cip-content-section">
                    <textarea id="cip-bunny-input" placeholder="在此输入想对BUNNY说的话..."></textarea>
                </div>
                <div id="cip-stickers-content" class="cip-content-section">
                    <div id="cip-sticker-categories" class="cip-sub-options-container">
                        <button id="cip-add-category-btn" class="cip-sub-option-btn">+</button>
                    </div>
                    <div id="cip-sticker-grid"></div>
                </div>
            </div>
            <div id="cip-panel-footer">
                <div style="display: flex; gap: 8px;">
                    <div id="cip-emoji-picker-btn">😊</div>
                    <div id="cip-color-settings-button">👕</div>
                </div>
                <div class="cip-footer-actions">
                    <button id="cip-recall-button">撤回</button>
                    <button id="cip-insert-button">插 入</button>
                </div>
            </div>
        `,
    );

    const emojiPicker = create('emoji-picker', 'cip-emoji-picker', 'cip-frosted-glass');
    const addCategoryModal = create(
      'div',
      'cip-add-category-modal',
      'cip-modal-backdrop hidden',
      `<div class="cip-modal-content cip-frosted-glass"><h3>添加新分类</h3><input type="text" id="cip-new-category-name" placeholder="输入分类名称"><div class="cip-modal-actions"><button id="cip-cancel-category-btn">取消</button><button id="cip-save-category-btn">保存</button></div></div>`,
    );
    const addStickersModal = create(
      'div',
      'cip-add-stickers-modal',
      'cip-modal-backdrop hidden',
      `<div class="cip-modal-content cip-frosted-glass"><h3 id="cip-add-sticker-title"></h3><p>每行一个，格式为：<br><code>表情包描述:图片链接</code></p><textarea id="cip-new-stickers-input" placeholder="可爱猫猫:https://example.com/cat.png\n狗狗点头:https://example.com/dog.gif"></textarea><div class="cip-modal-actions"><button id="cip-cancel-stickers-btn">取消</button><button id="cip-save-stickers-btn">保存</button></div></div>`,
    );
    const colorSettingsPanel = create(
      'div',
      'cip-color-settings-panel',
      'cip-frosted-glass',
      `
            <h3>自定义颜色</h3>
            <div class="cip-color-option" data-target="panelBg">
                <label>面板背景颜色</label>
                <div class="cip-color-picker" data-target="panelBg">
                    <div class="selector"></div>
                    <div class="opacity-slider"></div>
                </div>
                <div class="cip-color-controls">
                    <input type="text" id="cip-color-panel-bg-hex" placeholder="#000000">
                    <button id="cip-color-panel-bg-save">保存</button>
                </div>
            </div>
            <div class="cip-color-option" data-target="border">
                <label>边框颜色</label>
                <div class="cip-color-picker" data-target="border">
                    <div class="selector"></div>
                    <div class="opacity-slider"></div>
                </div>
                <div class="cip-color-controls">
                    <input type="text" id="cip-color-border-hex" placeholder="#000000">
                    <button id="cip-color-border-save">保存</button>
                </div>
            </div>
            <div class="cip-color-option" data-target="text">
                <label>功能栏字体颜色</label>
                <div class="cip-color-picker" data-target="text">
                    <div class="selector"></div>
                    <div class="opacity-slider"></div>
                </div>
                <div class="cip-color-controls">
                    <input type="text" id="cip-color-text-hex" placeholder="#000000">
                    <button id="cip-color-text-save">保存</button>
                </div>
            </div>
            <div class="cip-color-option" data-target="title">
                <label>功能标题颜色</label>
                <div class="cip-color-picker" data-target="title">
                    <div class="selector"></div>
                    <div class="opacity-slider"></div>
                </div>
                <div class="cip-color-controls">
                    <input type="text" id="cip-color-title-hex" placeholder="#000000">
                    <button id="cip-color-title-save">保存</button>
                </div>
            </div>
            <div class="cip-color-option" data-target="accent">
                <label>高亮/按钮颜色</label>
                <div class="cip-color-picker" data-target="accent">
                    <div class="selector"></div>
                    <div class="opacity-slider"></div>
                </div>
                <div class="cip-color-controls">
                    <input type="text" id="cip-color-accent-hex" placeholder="#000000">
                    <button id="cip-color-accent-save">保存</button>
                </div>
            </div>
            <div class="cip-color-option" data-target="activeBg">
                <label>高亮背景颜色</label>
                <div class="cip-color-picker" data-target="activeBg">
                    <div class="selector"></div>
                    <div class="opacity-slider"></div>
                </div>
                <div class="cip-color-controls">
                    <input type="text" id="cip-color-active-bg-hex" placeholder="#000000">
                    <button id="cip-color-active-bg-save">保存</button>
                </div>
            </div>
            <div class="cip-color-option" data-target="inputBg">
                <label>输入框背景颜色</label>
                <div class="cip-color-picker" data-target="inputBg">
                    <div class="selector"></div>
                    <div class="opacity-slider"></div>
                </div>
                <div class="cip-color-controls">
                    <input type="text" id="cip-color-input-bg-hex" placeholder="#000000">
                    <button id="cip-color-input-bg-save">保存</button>
                </div>
            </div>
            <div class="cip-color-option" data-target="delete">
                <label>删除按钮颜色</label>
                <div class="cip-color-picker" data-target="delete">
                    <div class="selector"></div>
                    <div class="opacity-slider"></div>
                </div>
                <div class="cip-color-controls">
                    <input type="text" id="cip-color-delete-hex" placeholder="#000000">
                    <button id="cip-color-delete-save">保存</button>
                </div>
            </div>
            <div class="cip-color-option" data-target="insertText">
                <label>插入按钮字体颜色</label>
                <div class="cip-color-picker" data-target="insertText">
                    <div class="selector"></div>
                    <div class="opacity-slider"></div>
                </div>
                <div class="cip-color-controls">
                    <input type="text" id="cip-color-insert-text-hex" placeholder="#000000">
                    <button id="cip-color-insert-text-save">保存</button>
                </div>
            </div>
            <div class="cip-color-option" data-target="insertHoverBg">
                <label>插入按钮Hover颜色</label>
                <div class="cip-color-picker" data-target="insertHoverBg">
                    <div class="selector"></div>
                    <div class="opacity-slider"></div>
                </div>
                <div class="cip-color-controls">
                    <input type="text" id="cip-color-insert-hover-bg-hex" placeholder="#000000">
                    <button id="cip-color-insert-hover-bg-save">保存</button>
                </div>
            </div>
            <div class="cip-color-option">
                <label>保存配色方案</label>
                <input type="text" id="cip-color-preset-name" placeholder="输入配色名称">
            </div>
            <select id="cip-color-presets">
                <option value="">选择已有配色方案</option>
            </select>
            <div class="cip-color-actions">
                <button id="cip-color-cancel-btn">取消</button>
                <button id="cip-color-save-btn">保存</button>
            </div>
        `,
    );
    return { carrotButton, inputPanel, emojiPicker, addCategoryModal, addStickersModal, colorSettingsPanel };
  }

  // --- 2. 注入UI到页面中 ---
  const { carrotButton, inputPanel, emojiPicker, addCategoryModal, addStickersModal, colorSettingsPanel } = createUI();
  const anchor = document.querySelector('#chat-buttons-container, #send_form');
  if (anchor) {
    document.body.appendChild(carrotButton);
    document.body.appendChild(inputPanel);
    document.body.appendChild(emojiPicker);
    document.body.appendChild(addCategoryModal);
    document.body.appendChild(addStickersModal);
    document.body.appendChild(colorSettingsPanel);
  } else {
    console.error('胡萝卜输入面板：未能找到SillyTavern的UI挂载点，插件无法加载。');
    return;
  }

  // --- 3. 获取所有元素的引用 (更新颜色设置相关引用) ---
  const get = id => document.getElementById(id);
  const queryAll = sel => document.querySelectorAll(sel);
  const formatDisplay = get('cip-format-display'),
    insertButton = get('cip-insert-button'),
    recallButton = get('cip-recall-button');
  const mainInput = get('cip-main-input'),
    voiceDurationInput = get('cip-voice-duration'),
    voiceMessageInput = get('cip-voice-message'),
    bunnyInput = get('cip-bunny-input');
  const stickerCategoriesContainer = get('cip-sticker-categories'),
    addCategoryBtn = get('cip-add-category-btn'),
    stickerGrid = get('cip-sticker-grid');
  const emojiPickerBtn = get('cip-emoji-picker-btn'),
    colorSettingsButton = get('cip-color-settings-button');
  const saveCategoryBtn = get('cip-save-category-btn'),
    cancelCategoryBtn = get('cip-cancel-category-btn'),
    newCategoryNameInput = get('cip-new-category-name');
  const addStickerTitle = get('cip-add-sticker-title'),
    saveStickersBtn = get('cip-save-stickers-btn'),
    cancelStickersBtn = get('cip-cancel-stickers-btn'),
    newStickersInput = get('cip-new-stickers-input');
  const colorPanel = get('cip-color-settings-panel'),
    colorPickers = queryAll('.cip-color-picker'),
    colorHexInputs = queryAll('.cip-color-controls input[type="text"]'),
    colorSaveButtons = queryAll('.cip-color-controls button'),
    colorPresetNameInput = get('cip-color-preset-name'),
    colorPresetsSelect = get('cip-color-presets'),
    colorCancelBtn = get('cip-color-cancel-btn'),
    colorSaveBtn = get('cip-color-save-btn');

  // --- 4. 核心逻辑与事件监听 (修改颜色设置逻辑) ---
  let currentTab = 'text',
    currentTextSubType = 'plain',
    stickerData = {},
    currentStickerCategory = '',
    selectedSticker = null;
  let colorPresets = {};
  const formatTemplates = {
    text: {
      plain: '“{content}”',
      image: '“[{content}.jpg]”',
      video: '“[{content}.mp4]”',
      music: '“[{content}.mp3]”',
      post: '“[{content}.link]”',
    },
    voice: "={duration}'|{message}=",
    bunny: '({content})',
    stickers: '!{desc}|{url}!',
    recall: '--',
  };

  // 默认颜色配置
  const defaultColors = {
    panelBg: '#ffffff',
    border: '#ffffff',
    text: '#333333',
    title: '#333333',
    accent: '#ff7f50',
    activeBg: '#ff7f50',
    inputBg: '#ffffff',
    delete: '#e74c3c',
    insertText: '#ffffff',
    insertHoverBg: '#e56a40',
    tabBg: '#00000000', // 默认透明
  };

  function updateFormatDisplay() {
    const e = get('cip-input-panel').querySelector(
      `.cip-sticker-category-btn[data-category="${currentStickerCategory}"]`,
    );
    queryAll('.cip-category-action-icon').forEach(e => e.remove());
    switch (currentTab) {
      case 'text':
        formatDisplay.textContent = `格式: ${formatTemplates.text[currentTextSubType].replace('{content}', '内容')}`;
        break;
      case 'voice':
        formatDisplay.textContent = "格式: =数字'|内容=";
        break;
      case 'bunny':
        formatDisplay.textContent = '格式: (内容)';
        break;
      case 'stickers':
        formatDisplay.textContent = '格式: !描述|链接!';
        if (e) {
          const t = document.createElement('i');
          t.textContent = ' ➕';
          t.className = 'cip-category-action-icon';
          t.title = '向此分类添加表情包';
          t.onclick = t => {
            t.stopPropagation();
            openAddStickersModal(currentStickerCategory);
          };
          e.appendChild(t);
          const o = document.createElement('i');
          o.textContent = ' 🗑️';
          o.className = 'cip-category-action-icon cip-delete-category-btn';
          o.title = '删除此分类';
          o.onclick = t => {
            t.stopPropagation();
            confirm(`确定删除「${currentStickerCategory}」分类?`) &&
              (delete stickerData[currentStickerCategory],
              saveStickerData(),
              renderCategories(),
              switchStickerCategory(Object.keys(stickerData)[0] || ''));
          };
          e.appendChild(o);
        }
    }
  }

  function switchTab(t) {
    currentTab = t;
    queryAll('.cip-tab-button').forEach(e => e.classList.toggle('active', e.dataset.tab === t));
    queryAll('.cip-content-section').forEach(e => e.classList.toggle('active', e.id === `cip-${t}-content`));
    const o = Object.keys(stickerData)[0];
    if (t === 'stickers' && !currentStickerCategory && o) {
      switchStickerCategory(o);
    } else if (t === 'stickers') {
      switchStickerCategory(currentStickerCategory);
    }
    updateFormatDisplay();
  }

  function switchTextSubType(t) {
    currentTextSubType = t;
    queryAll('#cip-text-content .cip-sub-option-btn').forEach(e =>
      e.classList.toggle('active', e.dataset.type === t),
    );
    updateFormatDisplay();
  }

  function switchStickerCategory(t) {
    currentStickerCategory = t;
    queryAll('.cip-sticker-category-btn').forEach(e => e.classList.toggle('active', e.dataset.category === t));
    renderStickers(t);
    selectedSticker = null;
    updateFormatDisplay();
  }

  function renderStickers(t) {
    stickerGrid.innerHTML = '';
    if (!t || !stickerData[t]) {
      stickerGrid.innerHTML = '<div class="cip-sticker-placeholder">请先选择或添加一个分类...</div>';
      return;
    }
    const o = stickerData[t];
    if (o.length === 0) {
      stickerGrid.innerHTML = '<div class="cip-sticker-placeholder">这个分类还没有表情包...</div>';
      return;
    }
    o.forEach((t, o) => {
      const e = document.createElement('div');
      e.className = 'cip-sticker-wrapper';
      const i = document.createElement('img');
      i.src = t.url;
      i.title = t.desc;
      i.className = 'cip-sticker-item';
      i.onclick = () => {
        queryAll('.cip-sticker-item.selected').forEach(e => e.classList.remove('selected'));
        i.classList.add('selected');
        selectedSticker = t;
      };
      const n = document.createElement('button');
      n.innerHTML = '×';
      n.className = 'cip-delete-sticker-btn';
      n.title = '删除这个表情包';
      n.onclick = e => {
        e.stopPropagation();
        if (confirm(`确定删除表情「${t.desc}」?`)) {
          stickerData[currentStickerCategory].splice(o, 1);
          saveStickerData();
          renderStickers(currentStickerCategory);
        }
      };
      e.appendChild(i);
      e.appendChild(n);
      stickerGrid.appendChild(e);
    });
  }

  function renderCategories() {
    queryAll('.cip-sticker-category-btn').forEach(e => e.remove());
    Object.keys(stickerData).forEach(t => {
      const o = document.createElement('button'),
        e = document.createElement('span');
      e.textContent = t;
      o.appendChild(e);
      o.className = 'cip-sub-option-btn cip-sticker-category-btn';
      o.dataset.category = t;
      o.onclick = () => switchStickerCategory(t);
      stickerCategoriesContainer.appendChild(o);
    });
  }

  function insertIntoSillyTavern(t) {
    const o = document.querySelector('#send_textarea');
    if (o) {
      o.value += (o.value.trim() ? '\n' : '') + t;
      o.dispatchEvent(new Event('input', { bubbles: true }));
      o.focus();
    } else {
      alert('未能找到SillyTavern的输入框！');
    }
  }

  function saveStickerData() {
    localStorage.setItem('cip_sticker_data', JSON.stringify(stickerData));
  }

  function loadStickerData() {
    const t = localStorage.getItem('cip_sticker_data');
    if (t) stickerData = JSON.parse(t);
  }

  function toggleModal(t, o) {
    get(t).classList.toggle('hidden', !o);
  }

  function openAddStickersModal(t) {
    addStickerTitle.textContent = `为「${t}」分类添加表情包`;
    newStickersInput.value = '';
    addStickersModal.dataset.currentCategory = t;
    toggleModal('cip-add-stickers-modal', true);
    newStickersInput.focus();
  }

  // --- 颜色设置相关逻辑 ---
  let currentColorPicker = null;

  function saveColorPreset() {
    const presetName = colorPresetNameInput.value.trim();
    if (!presetName) {
      alert('请输入配色方案名称！');
      return;
    }
    if (colorPresets[presetName]) {
      if (!confirm(`配色方案「${presetName}」已存在，是否覆盖？`)) return;
    }
    colorPresets[presetName] = {
      panelBg: getComputedStyle(document.documentElement).getPropertyValue('--cip-panel-bg-color').match(/\d+,\s*\d+,\s*\d+/)[0],
      border: getComputedStyle(document.documentElement).getPropertyValue('--cip-border-color').match(/\d+,\s*\d+,\s*\d+/)[0],
      text: rgbToHex(getComputedStyle(document.documentElement).getPropertyValue('--cip-text-color')),
      title: rgbToHex(getComputedStyle(document.documentElement).getPropertyValue('--cip-title-color')),
      accent: rgbToHex(getComputedStyle(document.documentElement).getPropertyValue('--cip-accent-color')),
      activeBg: getComputedStyle(document.documentElement).getPropertyValue('--cip-active-bg-color').match(/\d+,\s*\d+,\s*\d+/)[0],
      inputBg: getComputedStyle(document.documentElement).getPropertyValue('--cip-input-bg-color').match(/\d+,\s*\d+,\s*\d+/)[0],
      delete: rgbToHex(getComputedStyle(document.documentElement).getPropertyValue('--cip-delete-color')),
      insertText: rgbToHex(getComputedStyle(document.documentElement).getPropertyValue('--cip-insert-text-color')),
      insertHoverBg: rgbToHex(getComputedStyle(document.documentElement).getPropertyValue('--cip-insert-hover-bg-color')),
      tabBg: getComputedStyle(document.documentElement).getPropertyValue('--cip-tab-bg-color').match(/\d+,\s*\d+,\s*\d+/)[0],
    };
    localStorage.setItem('cip_color_presets', JSON.stringify(colorPresets));
    renderColorPresets();
    colorPresetNameInput.value = '';
    alert(`配色方案「${presetName}」已保存！`);
  }

  function loadColorPreset(presetName) {
    if (!presetName || !colorPresets[presetName]) return;
    const preset = colorPresets[presetName];
    const root = document.documentElement;
    root.style.setProperty('--cip-panel-bg-color', `rgba(${preset.panelBg}, 0.25)`);
    root.style.setProperty('--cip-border-color', `rgba(${preset.border}, 0.4)`);
    root.style.setProperty('--cip-text-color', rgbToHex(`rgb(${preset.text})`));
    root.style.setProperty('--cip-title-color', rgbToHex(`rgb(${preset.title})`));
    root.style.setProperty('--cip-accent-color', rgbToHex(`rgb(${preset.accent})`));
    root.style.setProperty('--cip-active-bg-color', `rgba(${preset.activeBg}, 0.3)`);
    root.style.setProperty('--cip-input-bg-color', `rgba(${preset.inputBg}, 0.5)`);
    root.style.setProperty('--cip-delete-color', rgbToHex(`rgb(${preset.delete})`));
    root.style.setProperty('--cip-insert-text-color', rgbToHex(`rgb(${preset.insertText})`));
    root.style.setProperty('--cip-insert-hover-bg-color', rgbToHex(`rgb(${preset.insertHoverBg})`));
    root.style.setProperty('--cip-tab-bg-color', `rgba(${preset.tabBg}, 1)`);
    updateColorInputs();
  }

  function renderColorPresets() {
    colorPresetsSelect.innerHTML = '<option value="">选择已有配色方案</option>';
    Object.keys(colorPresets).forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      colorPresetsSelect.appendChild(option);
    });
  }

  function applyColors(target, rgb) {
    const root = document.documentElement;
    switch (target) {
      case 'panelBg':
        root.style.setProperty('--cip-panel-bg-color', `rgba(${rgb}, 0.25)`);
        break;
      case 'border':
        root.style.setProperty('--cip-border-color', `rgba(${rgb}, 0.4)`);
        break;
      case 'text':
        root.style.setProperty('--cip-text-color', rgbToHex(`rgb(${rgb})`));
        break;
      case 'title':
        root.style.setProperty('--cip-title-color', rgbToHex(`rgb(${rgb})`));
        break;
      case 'accent':
        root.style.setProperty('--cip-accent-color', rgbToHex(`rgb(${rgb})`));
        break;
      case 'activeBg':
        root.style.setProperty('--cip-active-bg-color', `rgba(${rgb}, 0.3)`);
        break;
      case 'inputBg':
        root.style.setProperty('--cip-input-bg-color', `rgba(${rgb}, 0.5)`);
        break;
      case 'delete':
        root.style.setProperty('--cip-delete-color', rgbToHex(`rgb(${rgb})`));
        break;
      case 'insertText':
        root.style.setProperty('--cip-insert-text-color', rgbToHex(`rgb(${rgb})`));
        break;
      case 'insertHoverBg':
        root.style.setProperty('--cip-insert-hover-bg-color', rgbToHex(`rgb(${rgb})`));
        break;
      case 'tabBg':
        root.style.setProperty('--cip-tab-bg-color', `rgba(${rgb}, 1)`);
        break;
    }
    updateColorInputs();
  }

  function rgbToHex(rgb) {
    const [r, g, b] = rgb.match(/\d+/g).map(Number);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
  }

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  }

  function updateColorInputs() {
    const style = getComputedStyle(document.documentElement);
    colorHexInputs[0].value = rgbToHex(`rgb(${style.getPropertyValue('--cip-panel-bg-color').match(/\d+,\s*\d+,\s*\d+/)[0]})`);
    colorHexInputs[1].value = rgbToHex(`rgb(${style.getPropertyValue('--cip-border-color').match(/\d+,\s*\d+,\s*\d+/)[0]})`);
    colorHexInputs[2].value = rgbToHex(style.getPropertyValue('--cip-text-color'));
    colorHexInputs[3].value = rgbToHex(style.getPropertyValue('--cip-title-color'));
    colorHexInputs[4].value = rgbToHex(style.getPropertyValue('--cip-accent-color'));
    colorHexInputs[5].value = rgbToHex(`rgb(${style.getPropertyValue('--cip-active-bg-color').match(/\d+,\s*\d+,\s*\d+/)[0]})`);
    colorHexInputs[6].value = rgbToHex(`rgb(${style.getPropertyValue('--cip-input-bg-color').match(/\d+,\s*\d+,\s*\d+/)[0]})`);
    colorHexInputs[7].value = rgbToHex(style.getPropertyValue('--cip-delete-color'));
    colorHexInputs[8].value = rgbToHex(style.getPropertyValue('--cip-insert-text-color'));
    colorHexInputs[9].value = rgbToHex(style.getPropertyValue('--cip-insert-hover-bg-color'));
  }

  function initColorPicker(picker) {
    const selector = picker.querySelector('.selector');
    const opacitySlider = picker.querySelector('.opacity-slider');
    let isDragging = false;

    picker.addEventListener('mousedown', (e) => {
      isDragging = true;
      updateColor(e, picker);
    });

    picker.addEventListener('mousemove', (e) => {
      if (isDragging) updateColor(e, picker);
    });

    picker.addEventListener('mouseup', () => {
      isDragging = false;
    });

    opacitySlider.addEventListener('mousedown', (e) => {
      isDragging = true;
      updateOpacity(e, picker);
    });

    opacitySlider.addEventListener('mousemove', (e) => {
      if (isDragging) updateOpacity(e, picker);
    });

    opacitySlider.addEventListener('mouseup', () => {
      isDragging = false;
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });

    function updateColor(e, picker) {
      const rect = picker.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const width = rect.width - opacitySlider.offsetWidth;
      const height = rect.height;
      const newX = Math.max(0, Math.min(width, x));
      const newY = Math.max(0, Math.min(height, y));
      selector.style.left = `${newX - 5}px`;
      selector.style.top = `${newY - 5}px`;

      const ctx = document.createElement('canvas').getContext('2d');
      ctx.canvas.width = width;
      ctx.canvas.height = height;
      const gradient1 = ctx.createLinearGradient(0, 0, width, 0);
      gradient1.addColorStop(0, 'red');
      gradient1.addColorStop(1/6, 'yellow');
      gradient1.addColorStop(2/6, 'lime');
      gradient1.addColorStop(3/6, 'cyan');
      gradient1.addColorStop(4/6, 'blue');
      gradient1.addColorStop(5/6, 'magenta');
      gradient1.addColorStop(1, 'red');
      ctx.fillStyle = gradient1;
      ctx.fillRect(0, 0, width, height);
      const gradient2 = ctx.createLinearGradient(0, 0, 0, height);
      gradient2.addColorStop(0, 'rgba(255,255,255,1)');
      gradient2.addColorStop(0.5, 'rgba(255,255,255,0)');
      gradient2.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = gradient2;
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillRect(0, 0, width, height);
      const imageData = ctx.getImageData(newX, newY, 1, 1).data;
      const rgb = `${imageData[0]}, ${imageData[1]}, ${imageData[2]}`;
      applyColors(picker.dataset.target, rgb);
      const hexInput = picker.nextElementSibling.querySelector('input');
      hexInput.value = rgbToHex(`rgb(${rgb})`);
    }

    function updateOpacity(e, picker) {
      const rect = opacitySlider.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const height = rect.height;
      const opacity = Math.max(0, Math.min(1, 1 - y / height));
      const rgb = getComputedStyle(picker).backgroundColor.match(/\d+,\s*\d+,\s*\d+/)[0];
      applyColors(picker.dataset.target, rgb);
      const hexInput = picker.nextElementSibling.querySelector('input');
      hexInput.value = rgbToHex(`rgb(${rgb})`);
    }
  }

  function loadDefaultColors() {
    const root = document.documentElement;
    root.style.setProperty('--cip-panel-bg-color', `rgba(${hexToRgb(defaultColors.panelBg)}, 0.25)`);
    root.style.setProperty('--cip-border-color', `rgba(${hexToRgb(defaultColors.border)}, 0.4)`);
    root.style.setProperty('--cip-text-color', defaultColors.text);
    root.style.setProperty('--cip-title-color', defaultColors.title);
    root.style.setProperty('--cip-accent-color', defaultColors.accent);
    root.style.setProperty('--cip-active-bg-color', `rgba(${hexToRgb(defaultColors.activeBg)}, 0.3)`);
    root.style.setProperty('--cip-input-bg-color', `rgba(${hexToRgb(defaultColors.inputBg)}, 0.5)`);
    root.style.setProperty('--cip-delete-color', defaultColors.delete);
    root.style.setProperty('--cip-insert-text-color', defaultColors.insertText);
    root.style.setProperty('--cip-insert-hover-bg-color', defaultColors.insertHoverBg);
    root.style.setProperty('--cip-tab-bg-color', `rgba(${hexToRgb(defaultColors.tabBg)}, 1)`);
    updateColorInputs();
  }

  function loadSavedColorPresets() {
    const saved = localStorage.getItem('cip_color_presets');
    if (saved) {
      colorPresets = JSON.parse(saved);
      renderColorPresets();
    }
  }

  colorSettingsButton.addEventListener('click', e => {
    e.stopPropagation();
    const isVisible = colorPanel.style.display === 'block';
    if (isVisible) {
      colorPanel.style.display = 'none';
    } else {
      const btnRect = colorSettingsButton.getBoundingClientRect();
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        const panelWidth = 300;
        const panelHeight = 400;
        const left = Math.max(10, (window.innerWidth - panelWidth) / 2);
        const top = Math.max(10, (window.innerHeight - panelHeight) / 2);
        colorPanel.style.top = `${top}px`;
        colorPanel.style.left = `${left}px`;
      } else {
        let top = btnRect.top - 400 - 10;
        if (top < 10) top = btnRect.bottom + 10;
        colorPanel.style.top = `${top}px`;
        colorPanel.style.left = `${btnRect.left}px`;
      }
      colorPanel.style.display = 'block';
    }
  });

  colorCancelBtn.addEventListener('click', () => {
    colorPanel.style.display = 'none';
    loadDefaultColors();
  });

  colorSaveBtn.addEventListener('click', () => {
    saveColorPreset();
    colorPanel.style.display = 'none';
  });

  colorPickers.forEach(picker => initColorPicker(picker));
  colorSaveButtons.forEach((btn, index) => {
    btn.addEventListener('click', () => {
      const target = btn.parentElement.parentElement.dataset.target;
      const rgb = getComputedStyle(document.documentElement).getPropertyValue(`--cip-${target}-color`).match(/\d+,\s*\d+,\s*\d+/)[0] || getComputedStyle(document.documentElement).getPropertyValue(`--cip-${target}`).match(/\d+,\s*\d+,\s*\d+/)[0];
      applyColors(target, rgb);
    });
  });

  document.addEventListener('click', e => {
    if (inputPanel.classList.contains('active') && !inputPanel.contains(e.target) && !carrotButton.contains(e.target))
      hidePanel();
    if (
      emojiPicker.style.display === 'block' &&
      !emojiPicker.contains(e.target) &&
      !emojiPickerBtn.contains(e.target)
    ) {
      emojiPicker.style.display = 'none';
    }
    if (
      colorPanel.style.display === 'block' &&
      !colorPanel.contains(e.target) &&
      !colorSettingsButton.contains(e.target) &&
      !colorPresetNameInput.contains(e.target)
    ) {
      colorPanel.style.display = 'none';
    }
  });

  emojiPicker.addEventListener('emoji-click', event => {
    const emoji = event.detail.unicode;
    let target;
    if (currentTab === 'text') target = mainInput;
    else if (currentTab === 'voice') target = voiceMessageInput;
    else if (currentTab === 'bunny') target = bunnyInput;

    if (target) {
      const { selectionStart, selectionEnd, value } = target;
      target.value = value.substring(0, selectionStart) + emoji + value.substring(selectionEnd);
      target.focus();
      target.selectionEnd = selectionStart + emoji.length;
    }
    emojiPicker.style.display = 'none';
  });

  emojiPickerBtn.addEventListener('click', e => {
    e.stopPropagation();
    const isVisible = emojiPicker.style.display === 'block';
    if (isVisible) {
      emojiPicker.style.display = 'none';
    } else {
      const btnRect = emojiPickerBtn.getBoundingClientRect();
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        const pickerWidth = 300;
        const pickerHeight = 350;
        const left = Math.max(10, (window.innerWidth - pickerWidth) / 2);
        const top = Math.max(10, (window.innerHeight - pickerHeight) / 2);
        emojiPicker.style.top = `${top}px`;
        emojiPicker.style.left = `${left}px`;
      } else {
        let top = btnRect.top - 350 - 10;
        if (top < 10) top = btnRect.bottom + 10;
        emojiPicker.style.top = `${top}px`;
        emojiPicker.style.left = `${btnRect.left}px`;
      }
      emojiPicker.style.display = 'block';
    }
  });

  queryAll('.cip-tab-button').forEach(button =>
    button.addEventListener('click', e => switchTab(e.currentTarget.dataset.tab)),
  );
  queryAll('#cip-text-content .cip-sub-option-btn').forEach(button =>
    button.addEventListener('click', e => switchTextSubType(e.currentTarget.dataset.type)),
  );
  recallButton.addEventListener('click', () => insertIntoSillyTavern(formatTemplates.recall));

  insertButton.addEventListener('click', () => {
    let formattedText = '';
    let inputToClear = null;
    switch (currentTab) {
      case 'text':
        if (mainInput.value.trim()) {
          formattedText = formatTemplates.text[currentTextSubType].replace('{content}', mainInput.value);
          inputToClear = mainInput;
        }
        break;
      case 'voice':
        if (voiceDurationInput.value.trim() && voiceMessageInput.value.trim()) {
          formattedText = formatTemplates.voice
            .replace('{duration}', voiceDurationInput.value)
            .replace('{message}', voiceMessageInput.value);
          inputToClear = voiceMessageInput;
          voiceDurationInput.value = '';
        }
        break;
      case 'bunny':
        if (bunnyInput.value.trim()) {
          formattedText = formatTemplates.bunny.replace('{content}', bunnyInput.value);
          inputToClear = bunnyInput;
        }
        break;
      case 'stickers':
        if (selectedSticker) {
          formattedText = formatTemplates.stickers
            .replace('{desc}', selectedSticker.desc)
            .replace('{url}', selectedSticker.url);
        }
        break;
    }
    if (formattedText) {
      insertIntoSillyTavern(formattedText);
      if (inputToClear) {
        inputToClear.value = '';
      }
    }
  });

  addCategoryBtn.addEventListener('click', () => {
    newCategoryNameInput.value = '';
    toggleModal('cip-add-category-modal', true);
    newCategoryNameInput.focus();
  });

  cancelCategoryBtn.addEventListener('click', () => toggleModal('cip-add-category-modal', false));

  saveCategoryBtn.addEventListener('click', () => {
    const name = newCategoryNameInput.value.trim();
    if (name && !stickerData[name]) {
      stickerData[name] = [];
      saveStickerData();
      renderCategories();
      switchStickerCategory(name);
      toggleModal('cip-add-category-modal', false);
    } else if (stickerData[name]) alert('该分类已存在！');
    else alert('请输入有效的分类名称！');
  });

  cancelStickersBtn.addEventListener('click', () => toggleModal('cip-add-stickers-modal', false));

  saveStickersBtn.addEventListener('click', () => {
    const category = addStickersModal.dataset.currentCategory;
    const text = newStickersInput.value.trim();
    if (!category || !text) return;
    let addedCount = 0;
    text.split('\n').forEach(line => {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const desc = parts[0].trim();
        const url = parts.slice(1).join(':').trim();
        if (desc && url) {
          stickerData[category].push({ desc, url });
          addedCount++;
        }
      }
    });
    if (addedCount > 0) {
      saveStickerData();
      if (currentStickerCategory === category) renderStickers(category);
      toggleModal('cip-add-stickers-modal', false);
    } else alert('未能解析任何有效的表情包信息。');
  });

  // --- 5. 交互处理逻辑 ---
  function showPanel() {
    if (inputPanel.classList.contains('active')) return;
    const btnRect = carrotButton.getBoundingClientRect();
    const panelWidth = inputPanel.offsetWidth || 350;
    const panelHeight = inputPanel.offsetHeight || 380;
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      const left = Math.max(10, (window.innerWidth - panelWidth) / 2);
      const top = Math.max(10, (window.innerHeight - panelHeight) / 2);
      inputPanel.style.top = `${top}px`;
      inputPanel.style.left = `${left}px`;
    } else {
      let top = btnRect.top - panelHeight - 10;
      if (top < 10) {
        top = btnRect.bottom + 10;
      }
      let left = btnRect.left + btnRect.width / 2 - panelWidth / 2;
      left = Math.max(10, Math.min(left, window.innerWidth - panelWidth - 10));
      inputPanel.style.top = `${top}px`;
      inputPanel.style.left = `${left}px`;
    }
    inputPanel.classList.add('active');
  }

  function hidePanel() {
    inputPanel.classList.remove('active');
  }

  function dragHandler(e) {
    let isClick = true;
    if (e.type === 'touchstart') e.preventDefault();
    const rect = carrotButton.getBoundingClientRect();
    const offsetX = (e.type.includes('mouse') ? e.clientX : e.touches[0].clientX) - rect.left;
    const offsetY = (e.type.includes('mouse') ? e.clientY : e.touches[0].clientY) - rect.top;
    const move = e => {
      isClick = false;
      carrotButton.classList.add('is-dragging');
      let newLeft = (e.type.includes('mouse') ? e.clientX : e.touches[0].clientX) - offsetX;
      let newTop = (e.type.includes('mouse') ? e.clientY : e.touches[0].clientY) - offsetY;
      newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - carrotButton.offsetWidth));
      newTop = Math.max(0, Math.min(newTop, window.innerHeight - carrotButton.offsetHeight));
      carrotButton.style.position = 'fixed';
      carrotButton.style.left = `${newLeft}px`;
      carrotButton.style.top = `${newTop}px`;
    };
    const end = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', end);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', end);
      carrotButton.classList.remove('is-dragging');
      if (isClick) {
        inputPanel.classList.contains('active') ? hidePanel() : showPanel();
      } else {
        localStorage.setItem(
          'cip_button_position_v4',
          JSON.stringify({ top: carrotButton.style.top, left: carrotButton.style.left }),
        );
      }
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', end);
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend', end);
  }

  carrotButton.addEventListener('mousedown', dragHandler);
  carrotButton.addEventListener('touchstart', dragHandler, { passive: false });

  function loadButtonPosition() {
    const savedPos = JSON.parse(localStorage.getItem('cip_button_position_v4'));
    if (savedPos?.top && savedPos?.left) {
      carrotButton.style.position = 'fixed';
      carrotButton.style.top = savedPos.top;
      carrotButton.style.left = savedPos.left;
    }
  }

  $(() => {
    $(window).on('resize orientationchange', function () {
      if (inputPanel.classList.contains('active')) {
        setTimeout(() => {
          hidePanel();
          showPanel();
        }, 100);
      }
      if (emojiPicker.style.display === 'block') {
        setTimeout(() => {
          emojiPicker.style.display = 'none';
        }, 100);
      }
      if (colorPanel.style.display === 'block') {
        setTimeout(() => {
          colorPanel.style.display = 'none';
        }, 100);
      }
    });
  });

  function init() {
    loadStickerData();
    renderCategories();
    loadButtonPosition();
    loadSavedColorPresets();
    loadDefaultColors();
    switchStickerCategory(Object.keys(stickerData)[0] || '');
    switchTab('text');
  }
  init();
})();
