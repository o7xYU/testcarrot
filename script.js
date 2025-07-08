// SillyTavern / 胡萝卜输入助手 / script.js
// 由AI根据用户原有脚本重构
import { getContext, getDom, loadExtensionSettings, saveExtensionSettings } from '../../../../script.js';

// --- 插件设置 ---
const extensionName = '胡萝卜输入助手';
const extensionId = 'carrot-input-pro';
let settings;
const defaultSettings = {
  stickerData: {
    默认: [],
  },
  buttonPosition: {
    top: '80px',
    left: 'auto',
    right: '20px',
  },
};

// --- 全局状态变量 ---
let currentTab = 'text';
let currentTextSubType = 'plain';
let currentStickerCategory = '默认';
let selectedSticker = null;

// --- 格式化模板 ---
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

// --- UI创建函数 ---
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
            <div id="cip-text-content" class="cip-content-section active"><div class="cip-sub-options-container"><button class="cip-sub-option-btn active" data-type="plain">纯文本</button><button class="cip-sub-option-btn" data-type="image">图片</button><button class="cip-sub-option-btn" data-type="video">视频</button><button class="cip-sub-option-btn" data-type="music">音乐</button><button class="cip-sub-option-btn" data-type="post">帖子</button></div><textarea id="cip-main-input" placeholder="在此输入文字..."></textarea></div>
            <div id="cip-voice-content" class="cip-content-section"><input type="number" id="cip-voice-duration" placeholder="输入时长 (秒, 仅数字)"><textarea id="cip-voice-message" placeholder="输入语音识别出的内容..."></textarea></div>
            <div id="cip-bunny-content" class="cip-content-section"><textarea id="cip-bunny-input" placeholder="在此输入想对BUNNY说的话..."></textarea></div>
            <div id="cip-stickers-content" class="cip-content-section"><div id="cip-sticker-categories" class="cip-sub-options-container"><button id="cip-add-category-btn" class="cip-sub-option-btn">+</button></div><div id="cip-sticker-grid"></div></div>
        </div>
        <div id="cip-panel-footer"><div id="cip-emoji-picker-btn">😊</div><div class="cip-footer-actions"><button id="cip-recall-button">撤回</button><button id="cip-insert-button">插 入</button></div></div>
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

  return { carrotButton, inputPanel, emojiPicker, addCategoryModal, addStickersModal };
}

// --- 核心功能函数 ---
/**
 * A debounced version of saveExtensionSettings for performance.
 * @type {Function}
 */
const saveSettingsDebounced = debounce(saveExtensionSettings, 500);

// 获取DOM元素的便捷函数
const get = id => document.getElementById(id);
const queryAll = sel => document.querySelectorAll(sel);

function updateFormatDisplay() {
  const formatDisplay = get('cip-format-display');
  const activeCategoryBtn = get('cip-input-panel').querySelector(
    `.cip-sticker-category-btn[data-category="${currentStickerCategory}"]`,
  );

  queryAll('.cip-category-action-icon').forEach(icon => icon.remove());

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
      if (activeCategoryBtn) {
        const addIcon = document.createElement('i');
        addIcon.textContent = ' ➕';
        addIcon.className = 'cip-category-action-icon';
        addIcon.title = '向此分类添加表情包';
        addIcon.onclick = event => {
          event.stopPropagation();
          openAddStickersModal(currentStickerCategory);
        };
        activeCategoryBtn.appendChild(addIcon);

        // Don't allow deleting the default category
        if (currentStickerCategory !== '默认') {
          const deleteIcon = document.createElement('i');
          deleteIcon.textContent = ' 🗑️';
          deleteIcon.className = 'cip-category-action-icon cip-delete-category-btn';
          deleteIcon.title = '删除此分类';
          deleteIcon.onclick = event => {
            event.stopPropagation();
            if (confirm(`确定删除「${currentStickerCategory}」分类及其所有表情包?`)) {
              delete settings.stickerData[currentStickerCategory];
              saveSettingsDebounced(extensionName, settings);
              renderCategories();
              switchStickerCategory('默认');
            }
          };
          activeCategoryBtn.appendChild(deleteIcon);
        }
      }
      break;
  }
}

function switchTab(tab) {
  currentTab = tab;
  queryAll('.cip-tab-button').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  queryAll('.cip-content-section').forEach(section =>
    section.classList.toggle('active', section.id === `cip-${tab}-content`),
  );

  if (tab === 'stickers' && !currentStickerCategory) {
    const firstCategory = Object.keys(settings.stickerData)[0] || '默认';
    switchStickerCategory(firstCategory);
  }
  updateFormatDisplay();
}

function switchTextSubType(type) {
  currentTextSubType = type;
  queryAll('#cip-text-content .cip-sub-option-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.type === type),
  );
  updateFormatDisplay();
}

function switchStickerCategory(category) {
  currentStickerCategory = category;
  queryAll('.cip-sticker-category-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.category === category),
  );
  renderStickers(category);
  selectedSticker = null;
  updateFormatDisplay();
}

function renderStickers(category) {
  const stickerGrid = get('cip-sticker-grid');
  stickerGrid.innerHTML = '';
  if (!category || !settings.stickerData[category]) {
    stickerGrid.innerHTML = '<div class="cip-sticker-placeholder">请先选择或添加一个分类...</div>';
    return;
  }

  const stickers = settings.stickerData[category];
  if (stickers.length === 0) {
    stickerGrid.innerHTML = '<div class="cip-sticker-placeholder">这个分类还没有表情包...</div>';
    return;
  }

  stickers.forEach((sticker, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'cip-sticker-wrapper';

    const img = document.createElement('img');
    img.src = sticker.url;
    img.title = sticker.desc;
    img.className = 'cip-sticker-item';
    img.onclick = () => {
      queryAll('.cip-sticker-item.selected').forEach(item => item.classList.remove('selected'));
      img.classList.add('selected');
      selectedSticker = sticker;
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '&times;';
    deleteBtn.className = 'cip-delete-sticker-btn';
    deleteBtn.title = '删除这个表情包';
    deleteBtn.onclick = event => {
      event.stopPropagation();
      if (confirm(`确定删除表情「${sticker.desc}」?`)) {
        settings.stickerData[currentStickerCategory].splice(index, 1);
        saveSettingsDebounced(extensionName, settings);
        renderStickers(currentStickerCategory); // Re-render to reflect deletion
      }
    };

    wrapper.appendChild(img);
    wrapper.appendChild(deleteBtn);
    stickerGrid.appendChild(wrapper);
  });
}

function renderCategories() {
  const stickerCategoriesContainer = get('cip-sticker-categories');
  // Clear only category buttons, preserve the add button
  queryAll('.cip-sticker-category-btn').forEach(btn => btn.remove());

  Object.keys(settings.stickerData).forEach(category => {
    const btn = document.createElement('button');
    const span = document.createElement('span');
    span.textContent = category;
    btn.appendChild(span);
    btn.className = 'cip-sub-option-btn cip-sticker-category-btn';
    btn.dataset.category = category;
    btn.onclick = () => switchStickerCategory(category);
    stickerCategoriesContainer.appendChild(btn);
  });
}

function insertIntoSillyTavern(text) {
  const context = getContext();
  const textarea = getDom.send_textarea();
  if (textarea) {
    textarea.value += (textarea.value.trim() ? '\n' : '') + text;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.focus();
  } else {
    console.error(`${extensionName}: 未能找到SillyTavern的输入框！`);
  }
}

function toggleModal(modalId, show) {
  get(modalId).classList.toggle('hidden', !show);
}

function openAddStickersModal(category) {
  get('cip-add-sticker-title').textContent = `为「${category}」分类添加表情包`;
  get('cip-new-stickers-input').value = '';
  get('cip-add-stickers-modal').dataset.currentCategory = category;
  toggleModal('cip-add-stickers-modal', true);
  get('cip-new-stickers-input').focus();
}

function showPanel() {
  const inputPanel = get('cip-input-panel');
  const carrotButton = get('cip-carrot-button');
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
    if (top < 10) top = btnRect.bottom + 10;
    let left = btnRect.left + btnRect.width / 2 - panelWidth / 2;
    left = Math.max(10, Math.min(left, window.innerWidth - panelWidth - 10));
    inputPanel.style.top = `${top}px`;
    inputPanel.style.left = `${left}px`;
  }
  inputPanel.classList.add('active');
}

function hidePanel() {
  get('cip-input-panel').classList.remove('active');
}

function dragHandler(event) {
  const carrotButton = get('cip-carrot-button');
  const inputPanel = get('cip-input-panel');
  let isClick = true;
  if (event.type === 'touchstart') event.preventDefault();

  const rect = carrotButton.getBoundingClientRect();
  const offsetX = (event.type.includes('mouse') ? event.clientX : event.touches[0].clientX) - rect.left;
  const offsetY = (event.type.includes('mouse') ? event.clientY : event.touches[0].clientY) - rect.top;

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
    carrotButton.style.right = 'auto'; // Important when dragging
    carrotButton.style.bottom = 'auto'; // Important when dragging
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
      // Save position
      settings.buttonPosition = {
        top: carrotButton.style.top,
        left: carrotButton.style.left,
        right: 'auto',
        bottom: 'auto',
      };
      saveSettingsDebounced(extensionName, settings);
    }
  };

  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', end);
  document.addEventListener('touchmove', move, { passive: false });
  document.addEventListener('touchend', end);
}

function loadButtonPosition() {
  const carrotButton = get('cip-carrot-button');
  const pos = settings.buttonPosition;
  if (pos && pos.top && (pos.left || pos.right)) {
    carrotButton.style.position = 'fixed';
    carrotButton.style.top = pos.top;
    carrotButton.style.left = pos.left;
    carrotButton.style.right = pos.right || 'auto';
    carrotButton.style.bottom = pos.bottom || 'auto';
  }
}

// --- 初始化和事件绑定 ---
jQuery(async () => {
  // Load settings
  settings = await loadExtensionSettings(extensionName, defaultSettings);

  // Load Emoji Picker
  const pickerScript = document.createElement('script');
  pickerScript.type = 'module';
  pickerScript.src = 'https://cdn.jsdelivr.net/npm/emoji-picker-element@^1/index.js';
  document.head.appendChild(pickerScript);

  // Create and inject UI
  const { carrotButton, inputPanel, emojiPicker, addCategoryModal, addStickersModal } = createUI();
  const anchor = getDom.chat_input_form();
  if (anchor) {
    document.body.appendChild(carrotButton);
    document.body.appendChild(inputPanel);
    document.body.appendChild(emojiPicker);
    document.body.appendChild(addCategoryModal);
    document.body.appendChild(addStickersModal);
  } else {
    console.error(`${extensionName}: 未能找到SillyTavern的UI挂载点，插件无法加载。`);
    return;
  }

  // Get element references
  const mainInput = get('cip-main-input');
  const voiceDurationInput = get('cip-voice-duration');
  const voiceMessageInput = get('cip-voice-message');
  const bunnyInput = get('cip-bunny-input');

  // Bind events
  get('cip-insert-button').addEventListener('click', () => {
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

  get('cip-recall-button').addEventListener('click', () => insertIntoSillyTavern(formatTemplates.recall));

  queryAll('.cip-tab-button').forEach(button =>
    button.addEventListener('click', e => switchTab(e.currentTarget.dataset.tab)),
  );
  queryAll('#cip-text-content .cip-sub-option-btn').forEach(button =>
    button.addEventListener('click', e => switchTextSubType(e.currentTarget.dataset.type)),
  );

  // Sticker category management
  get('cip-add-category-btn').addEventListener('click', () => {
    get('cip-new-category-name').value = '';
    toggleModal('cip-add-category-modal', true);
    get('cip-new-category-name').focus();
  });
  get('cip-cancel-category-btn').addEventListener('click', () => toggleModal('cip-add-category-modal', false));
  get('cip-save-category-btn').addEventListener('click', () => {
    const name = get('cip-new-category-name').value.trim();
    if (name && !settings.stickerData[name]) {
      settings.stickerData[name] = [];
      saveSettingsDebounced(extensionName, settings);
      renderCategories();
      switchStickerCategory(name);
      toggleModal('cip-add-category-modal', false);
    } else if (settings.stickerData[name]) {
      alert('该分类已存在！');
    } else {
      alert('请输入有效的分类名称！');
    }
  });

  // Add stickers management
  get('cip-cancel-stickers-btn').addEventListener('click', () => toggleModal('cip-add-stickers-modal', false));
  get('cip-save-stickers-btn').addEventListener('click', () => {
    const category = get('cip-add-stickers-modal').dataset.currentCategory;
    const text = get('cip-new-stickers-input').value.trim();
    if (!category || !text) return;

    let addedCount = 0;
    text.split('\n').forEach(line => {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const desc = parts[0].trim();
        const url = parts.slice(1).join(':').trim();
        if (desc && url) {
          settings.stickerData[category].push({ desc, url });
          addedCount++;
        }
      }
    });

    if (addedCount > 0) {
      saveSettingsDebounced(extensionName, settings);
      if (currentStickerCategory === category) renderStickers(category);
      toggleModal('cip-add-stickers-modal', false);
    } else {
      alert('未能解析任何有效的表情包信息。请检查格式（描述:链接），每行一个。');
    }
  });

  // Emoji Picker logic
  const emojiPickerBtn = get('cip-emoji-picker-btn');
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

  // Global click listener to hide panels
  document.addEventListener('click', e => {
    if (inputPanel.classList.contains('active') && !inputPanel.contains(e.target) && !carrotButton.contains(e.target)) {
      hidePanel();
    }
    if (
      emojiPicker.style.display === 'block' &&
      !emojiPicker.contains(e.target) &&
      !emojiPickerBtn.contains(e.target)
    ) {
      emojiPicker.style.display = 'none';
    }
  });

  // Drag and drop for the carrot button
  carrotButton.addEventListener('mousedown', dragHandler);
  carrotButton.addEventListener('touchstart', dragHandler, { passive: false });

  // Window resize listener
  window.addEventListener('resize', () => {
    if (inputPanel.classList.contains('active')) {
      hidePanel();
      showPanel();
    }
    if (emojiPicker.style.display === 'block') {
      emojiPicker.style.display = 'none';
    }
  });

  // Final initialization
  loadButtonPosition();
  renderCategories();
  const firstCategory = Object.keys(settings.stickerData)[0] || '默认';
  switchStickerCategory(firstCategory);
  switchTab('text');
});

// Simple debounce function
function debounce(fn, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}
