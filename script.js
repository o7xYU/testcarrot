// script.js (v2.4 - 修复点击配色名称输入框导致主面板和颜色面板关闭的问题)
(function () {
  if (document.getElementById('cip-carrot-button')) return;

  // --- 动态加载Emoji Picker库 ---
  const pickerScript = document.createElement('script');
  pickerScript.type = 'module';
  pickerScript.src = 'https://cdn.jsdelivr.net/npm/emoji-picker-element@^1/index.js';
  document.head.appendChild(pickerScript);

  // --- 1. 创建所有UI元素 ---
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
            <div class="cip-color-option">
                <label>面板背景颜色</label>
                <input type="color" id="cip-color-panel-bg" value="#ffffff">
            </div>
            <div class="cip-color-option">
                <label>边框颜色</label>
                <input type="color" id="cip-color-border" value="#ffffff">
            </div>
            <div class="cip-color-option">
                <label>功能栏字体颜色</label>
                <input type="color" id="cip-color-text" value="#333333">
            </div>
            <div class="cip-color-option">
                <label>功能标题颜色</label>
                <input type="color" id="cip-color-title" value="#333333">
            </div>
            <div class="cip-color-option">
                <label>功能按钮背景颜色</label>
                <input type="color" id="cip-color-tabs-bg" value="#ffffff">
            </div>
            <div class="cip-color-option">
                <label>高亮/按钮颜色</label>
                <input type="color" id="cip-color-accent" value="#ff7f50">
            </div>
            <div class="cip-color-option">
                <label>高亮背景颜色</label>
                <input type="color" id="cip-color-active-bg" value="#ff7f50">
            </div>
            <div class="cip-color-option">
                <label>输入框背景颜色</label>
                <input type="color" id="cip-color-input-bg" value="#ffffff">
            </div>
            <div class="cip-color-option">
                <label>删除按钮颜色</label>
                <input type="color" id="cip-color-delete" value="#e74c3c">
            </div>
            <div class="cip-color-option">
                <label>插入按钮字体颜色</label>
                <input type="color" id="cip-color-insert-text" value="#ffffff">
            </div>
            <div class="cip-color-option">
                <label>插入按钮Hover颜色</label>
                <input type="color" id="cip-color-insert-hover-bg" value="#e56a40">
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

  // --- 3. 获取所有元素的引用 ---
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
    colorPanelBgInput = get('cip-color-panel-bg'),
    colorBorderInput = get('cip-color-border'),
    colorTextInput = get('cip-color-text'),
    colorTitleInput = get('cip-color-title'),
    colorTabsBgInput = get('cip-color-tabs-bg'),
    colorAccentInput = get('cip-color-accent'),
    colorActiveBgInput = get('cip-color-active-bg'),
    colorInputBgInput = get('cip-color-input-bg'),
    colorDeleteInput = get('cip-color-delete'),
    colorInsertTextInput = get('cip-color-insert-text'),
    colorInsertHoverBgInput = get('cip-color-insert-hover-bg'),
    colorPresetNameInput = get('cip-color-preset-name'),
    colorPresetsSelect = get('cip-color-presets'),
    colorCancelBtn = get('cip-color-cancel-btn'),
    colorSaveBtn = get('cip-color-save-btn');

  // --- 4. 核心逻辑与事件监听 ---
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
    tabsBg: '#ffffff',
    accent: '#ff7f50',
    activeBg: '#ff7f50',
    inputBg: '#ffffff',
    delete: '#e74c3c',
    insertText: '#ffffff',
    insertHoverBg: '#e56a40',
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
      panelBg: colorPanelBgInput.value,
      border: colorBorderInput.value,
      text: colorTextInput.value,
      title: colorTitleInput.value,
      tabsBg: colorTabsBgInput.value,
      accent: colorAccentInput.value,
      activeBg: colorActiveBgInput.value,
      inputBg: colorInputBgInput.value,
      delete: colorDeleteInput.value,
      insertText: colorInsertTextInput.value,
      insertHoverBg: colorInsertHoverBgInput.value,
    };
    localStorage.setItem('cip_color_presets', JSON.stringify(colorPresets));
    renderColorPresets();
    colorPresetNameInput.value = '';
    alert(`配色方案「${presetName}」已保存！`);
  }

  function loadColorPreset(presetName) {
    if (!presetName || !colorPresets[presetName]) return;
    const preset = colorPresets[presetName];
    colorPanelBgInput.value = preset.panelBg;
    colorBorderInput.value = preset.border;
    colorTextInput.value = preset.text;
    colorTitleInput.value = preset.title;
    colorTabsBgInput.value = preset.tabsBg;
    colorAccentInput.value = preset.accent;
    colorActiveBgInput.value = preset.activeBg;
    colorInputBgInput.value = preset.inputBg;
    colorDeleteInput.value = preset.delete;
    colorInsertTextInput.value = preset.insertText;
    colorInsertHoverBgInput.value = preset.insertHoverBg;
    applyColors();
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

  function applyColors() {
    const root = document.documentElement;
    root.style.setProperty('--cip-panel-bg-color', `rgba(${hexToRgb(colorPanelBgInput.value)}, 0.25)`);
    root.style.setProperty('--cip-border-color', `rgba(${hexToRgb(colorBorderInput.value)}, 0.4)`);
    root.style.setProperty('--cip-text-color', colorTextInput.value);
    root.style.setProperty('--cip-title-color', colorTitleInput.value);
    root.style.setProperty('--cip-tabs-bg-color', colorTabsBgInput.value);
    root.style.setProperty('--cip-accent-color', colorAccentInput.value);
    root.style.setProperty('--cip-active-bg-color', `rgba(${hexToRgb(colorActiveBgInput.value)}, 0.3)`);
    root.style.setProperty('--cip-input-bg-color', `rgba(${hexToRgb(colorInputBgInput.value)}, 0.5)`);
    root.style.setProperty('--cip-delete-color', colorDeleteInput.value);
    root.style.setProperty('--cip-insert-text-color', colorInsertTextInput.value);
    root.style.setProperty('--cip-insert-hover-bg-color', colorInsertHoverBgInput.value);
  }

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  }

  function loadDefaultColors() {
    colorPanelBgInput.value = defaultColors.panelBg;
    colorBorderInput.value = defaultColors.border;
    colorTextInput.value = defaultColors.text;
    colorTitleInput.value = defaultColors.title;
    colorTabsBgInput.value = defaultColors.tabsBg;
    colorAccentInput.value = defaultColors.accent;
    colorActiveBgInput.value = defaultColors.activeBg;
    colorInputBgInput.value = defaultColors.inputBg;
    colorDeleteInput.value = defaultColors.delete;
    colorInsertTextInput.value = defaultColors.insertText;
    colorInsertHoverBgInput.value = defaultColors.insertHoverBg;
    applyColors();
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
      const panelWidth = 300;
      const panelHeight = 400;
      const isMobile = window.innerWidth <= 768;
      const left = Math.max(10, (window.innerWidth - panelWidth) / 2);
      const top = Math.max(10, (window.innerHeight - panelHeight) / 2);
      colorPanel.style.top = `${top}px`;
      colorPanel.style.left = `${left}px`;
      colorPanel.style.display = 'block';
    }
  });

  colorCancelBtn.addEventListener('click', e => {
    e.stopPropagation();
    colorPanel.style.display = 'none';
    loadDefaultColors();
  });

  colorSaveBtn.addEventListener('click', e => {
    e.stopPropagation();
    saveColorPreset();
    colorPanel.style.display = 'none';
  });

  // 修复点击配色名称输入框关闭主面板和颜色面板的问题
  colorPresetNameInput.addEventListener('click', e => e.stopPropagation());
  colorPresetNameInput.addEventListener('focus', e => e.stopPropagation());

  [colorPanelBgInput, colorBorderInput, colorTextInput, colorTitleInput, colorTabsBgInput, colorAccentInput, colorActiveBgInput, colorInputBgInput, colorDeleteInput, colorInsertTextInput, colorInsertHoverBgInput].forEach(input => {
    input.addEventListener('input', applyColors);
    input.addEventListener('click', e => e.stopPropagation());
  });

  colorPresetsSelect.addEventListener('change', e => {
    e.stopPropagation();
    loadColorPreset(e.target.value);
  });

  emojiPicker.addEventListener('emoji-click', event => {
    event.stopPropagation();
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
    button.addEventListener('click', e => {
      e.stopPropagation();
      switchTab(e.currentTarget.dataset.tab);
    }),
  );

  queryAll('#cip-text-content .cip-sub-option-btn').forEach(button =>
    button.addEventListener('click', e => {
      e.stopPropagation();
      switchTextSubType(e.currentTarget.dataset.type);
    }),
  );

  recallButton.addEventListener('click', e => {
    e.stopPropagation();
    insertIntoSillyTavern(formatTemplates.recall);
  });

  insertButton.addEventListener('click', e => {
    e.stopPropagation();
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

  addCategoryBtn.addEventListener('click', e => {
    e.stopPropagation();
    newCategoryNameInput.value = '';
    toggleModal('cip-add-category-modal', true);
    newCategoryNameInput.focus();
  });

  cancelCategoryBtn.addEventListener('click', e => {
    e.stopPropagation();
    toggleModal('cip-add-category-modal', false);
  });

  saveCategoryBtn.addEventListener('click', e => {
    e.stopPropagation();
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

  cancelStickersBtn.addEventListener('click', e => {
    e.stopPropagation();
    toggleModal('cip-add-stickers-modal', false);
  });

  saveStickersBtn.addEventListener('click', e => {
    e.stopPropagation();
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

  document.addEventListener('click', e => {
    // 优化全局点击事件，确保点击颜色设置面板内部不关闭主面板或颜色面板
    if (
      inputPanel.classList.contains('active') &&
      !inputPanel.contains(e.target) &&
      !carrotButton.contains(e.target) &&
      !colorPanel.contains(e.target)
    ) {
      hidePanel();
    }
    if (
      colorPanel.style.display === 'block' &&
      !colorPanel.contains(e.target) &&
      !colorSettingsButton.contains(e.target)
    ) {
      colorPanel.style.display = 'none';
    }
    if (
      emojiPicker.style.display === 'block' &&
      !emojiPicker.contains(e.target) &&
      !emojiPickerBtn.contains(e.target)
    ) {
      emojiPicker.style.display = 'none';
    }
  });

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
