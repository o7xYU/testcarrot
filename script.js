// 智能输入助手插件 (Smart Input Assistant v1.0)
// 支持多种格式的快速输入功能
(function () {
  'use strict';

  // 防止重复加载
  if (document.getElementById('sia-trigger-button')) {
    console.log('智能输入助手已加载，跳过重复加载');
    return;
  }

  // 动态加载Emoji Picker
  const loadEmojiPicker = () => {
    if (!document.querySelector('script[src*="emoji-picker-element"]')) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://cdn.jsdelivr.net/npm/emoji-picker-element@^1/index.js';
      document.head.appendChild(script);
    }
  };

  // 格式模板配置
  const FORMAT_TEMPLATES = {
    message: {
      text: '"【{content}】"',
      quote: '"{content}"',
      emphasis: '**{content}**',
      whisper: '*{content}*',
      system: '[系统]{content}',
    },
    media: {
      image: '[图片:{content}]',
      video: '[视频:{content}]',
      audio: '[音频:{content}]',
      file: '[文件:{content}]',
      link: '[链接:{content}]',
    },
    action: {
      action: '《{content}》',
      thought: '（{content}）',
      emotion: '#{content}#',
      ooc: '((OOC: {content}))',
    },
    custom: {
      recall: '>>撤回<<',
      break: '---分割线---',
      timestamp: '[{timestamp}]',
    },
  };

  // 插件状态管理
  const state = {
    currentTab: 'message',
    currentSubType: 'text',
    selectedAsset: null,
    currentCategory: '',
    assetData: {},
    isInitialized: false,
  };

  // 创建主触发按钮
  const triggerButton = document.createElement('button');
  triggerButton.id = 'sia-trigger-button';
  triggerButton.innerHTML = '🎯';
  triggerButton.title = '智能输入助手';

  // 创建主面板
  const mainPanel = document.createElement('div');
  mainPanel.id = 'sia-main-panel';
  mainPanel.innerHTML = `
    <div class="sia-panel-header">
      <h3 class="sia-panel-title">智能输入助手</h3>
      <div class="sia-tabs">
        <button class="sia-tab active" data-tab="message">💬 消息</button>
        <button class="sia-tab" data-tab="media">🎭 媒体</button>
        <button class="sia-tab" data-tab="action">⚡ 动作</button>
        <button class="sia-tab" data-tab="assets">📂 素材</button>
      </div>
      <div class="sia-format-display"></div>
    </div>
    
    <div class="sia-panel-content">
      <!-- 消息标签页 -->
      <div class="sia-content-section active" data-section="message">
        <div class="sia-sub-options">
          <button class="sia-sub-option active" data-type="text">📝 普通</button>
          <button class="sia-sub-option" data-type="quote">💭 引用</button>
          <button class="sia-sub-option" data-type="emphasis">⭐ 强调</button>
          <button class="sia-sub-option" data-type="whisper">🤫 低语</button>
          <button class="sia-sub-option" data-type="system">⚙️ 系统</button>
        </div>
        <textarea class="sia-textarea" id="sia-message-input" placeholder="输入你想发送的消息内容..."></textarea>
      </div>

      <!-- 媒体标签页 -->
      <div class="sia-content-section" data-section="media">
        <div class="sia-sub-options">
          <button class="sia-sub-option active" data-type="image">🖼️ 图片</button>
          <button class="sia-sub-option" data-type="video">🎥 视频</button>
          <button class="sia-sub-option" data-type="audio">🎵 音频</button>
          <button class="sia-sub-option" data-type="file">📄 文件</button>
          <button class="sia-sub-option" data-type="link">🔗 链接</button>
        </div>
        <input type="text" class="sia-input" id="sia-media-input" placeholder="输入媒体描述或链接...">
      </div>

      <!-- 动作标签页 -->
      <div class="sia-content-section" data-section="action">
        <div class="sia-sub-options">
          <button class="sia-sub-option active" data-type="action">🎭 动作</button>
          <button class="sia-sub-option" data-type="thought">💭 内心</button>
          <button class="sia-sub-option" data-type="emotion">😊 情感</button>
          <button class="sia-sub-option" data-type="ooc">📢 OOC</button>
        </div>
        <textarea class="sia-textarea" id="sia-action-input" placeholder="描述角色的动作或状态..."></textarea>
      </div>

      <!-- 素材标签页 -->
      <div class="sia-content-section" data-section="assets">
        <div class="sia-sub-options">
          <button class="sia-sub-option add-btn" id="sia-add-category">➕ 添加分类</button>
        </div>
        <div class="sia-grid" id="sia-assets-grid">
          <div class="sia-grid-placeholder">暂无素材，点击上方按钮添加分类</div>
        </div>
      </div>
    </div>

    <div class="sia-panel-footer">
      <button class="sia-emoji-btn" id="sia-emoji-btn">😀</button>
      <div class="sia-actions">
        <button class="sia-btn sia-btn-secondary" id="sia-recall-btn">撤回</button>
        <button class="sia-btn sia-btn-primary" id="sia-insert-btn">插入</button>
      </div>
    </div>
  `;

  // 创建Emoji picker
  const emojiPicker = document.createElement('emoji-picker');
  emojiPicker.id = 'sia-emoji-picker';
  emojiPicker.style.display = 'none';

  // 创建分类创建模态框
  const categoryModal = document.createElement('div');
  categoryModal.className = 'sia-modal';
  categoryModal.id = 'sia-category-modal';
  categoryModal.innerHTML = `
    <div class="sia-modal-content">
      <h3 class="sia-modal-title">创建新分类</h3>
      <input type="text" class="sia-input" id="sia-category-name" placeholder="输入分类名称...">
      <div class="sia-modal-actions">
        <button class="sia-btn sia-btn-secondary" id="sia-cancel-category">取消</button>
        <button class="sia-btn sia-btn-primary" id="sia-save-category">创建</button>
      </div>
    </div>
  `;

  // 创建素材添加模态框
  const assetModal = document.createElement('div');
  assetModal.className = 'sia-modal';
  assetModal.id = 'sia-asset-modal';
  assetModal.innerHTML = `
    <div class="sia-modal-content">
      <h3 class="sia-modal-title" id="sia-asset-modal-title">添加素材</h3>
      <p class="sia-modal-description">每行一个素材，格式：描述|内容</p>
      <textarea class="sia-textarea" id="sia-asset-content" placeholder="素材1|内容1\n素材2|内容2"></textarea>
      <div class="sia-modal-actions">
        <button class="sia-btn sia-btn-secondary" id="sia-cancel-asset">取消</button>
        <button class="sia-btn sia-btn-primary" id="sia-save-asset">保存</button>
      </div>
    </div>
  `;

  // 检查SillyTavern环境并添加UI元素
  const sendForm = document.querySelector('#send_form');
  if (sendForm) {
    sendForm.appendChild(triggerButton);
    document.body.appendChild(mainPanel);
    document.body.appendChild(emojiPicker);
    document.body.appendChild(categoryModal);
    document.body.appendChild(assetModal);
  } else {
    console.error('智能输入助手：未找到SillyTavern的UI挂载点');
    return;
  }

  // DOM元素引用
  const elements = {
    triggerButton: document.getElementById('sia-trigger-button'),
    mainPanel: document.getElementById('sia-main-panel'),
    emojiPicker: document.getElementById('sia-emoji-picker'),
    categoryModal: document.getElementById('sia-category-modal'),
    assetModal: document.getElementById('sia-asset-modal'),
    formatDisplay: document.querySelector('.sia-format-display'),
    messageInput: document.getElementById('sia-message-input'),
    mediaInput: document.getElementById('sia-media-input'),
    actionInput: document.getElementById('sia-action-input'),
    assetsGrid: document.getElementById('sia-assets-grid'),
    emojiBtn: document.getElementById('sia-emoji-btn'),
    recallBtn: document.getElementById('sia-recall-btn'),
    insertBtn: document.getElementById('sia-insert-btn'),
    addCategoryBtn: document.getElementById('sia-add-category'),
    categoryNameInput: document.getElementById('sia-category-name'),
    assetContentInput: document.getElementById('sia-asset-content'),
    assetModalTitle: document.getElementById('sia-asset-modal-title'),
  };

  // 插入内容到SillyTavern输入框
  function insertText(textToInsert) {
    if (!textToInsert) return;
    const textarea = document.querySelector('#send_textarea');
    if (!textarea) {
      alert('未找到SillyTavern输入框！');
      return false;
    }

    if (textarea.value.trim().length > 0) {
      textarea.value += `\n${textToInsert}`;
    } else {
      textarea.value = textToInsert;
    }

    // 触发输入事件以确保SillyTavern检测到变化
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.focus();
    textarea.scrollTop = textarea.scrollHeight;
    return true;
  }

  // 更新格式显示
  const updateFormatDisplay = () => {
    if (!elements.formatDisplay) return;

    const template = FORMAT_TEMPLATES[state.currentTab]?.[state.currentSubType];
    if (template) {
      const displayText = template.replace('{content}', '内容').replace('{timestamp}', '时间戳');
      elements.formatDisplay.textContent = `格式预览: ${displayText}`;
    } else {
      elements.formatDisplay.textContent = '选择一个选项查看格式';
    }
  };

  // 切换标签页
  const switchTab = tabName => {
    state.currentTab = tabName;

    // 更新标签按钮状态
    document.querySelectorAll('.sia-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // 更新内容区域
    document.querySelectorAll('.sia-content-section').forEach(section => {
      section.classList.toggle('active', section.dataset.section === tabName);
    });

    // 重置子类型为第一个可用选项
    const firstSubOption = document.querySelector(`[data-section="${tabName}"] .sia-sub-option`);
    if (firstSubOption && firstSubOption.dataset.type) {
      switchSubType(firstSubOption.dataset.type);
    }

    // 如果是素材标签页，渲染分类
    if (tabName === 'assets') {
      renderCategories();
    }

    updateFormatDisplay();
  };

  // 切换子类型
  const switchSubType = subType => {
    state.currentSubType = subType;

    // 更新当前标签页下的子选项状态
    const currentSection = document.querySelector(`[data-section="${state.currentTab}"]`);
    if (currentSection) {
      currentSection.querySelectorAll('.sia-sub-option').forEach(option => {
        option.classList.toggle('active', option.dataset.type === subType);
      });
    }

    updateFormatDisplay();
  };

  // 素材管理函数
  const saveAssetData = () => {
    localStorage.setItem('sia_asset_data', JSON.stringify(state.assetData));
  };

  const loadAssetData = () => {
    const saved = localStorage.getItem('sia_asset_data');
    if (saved) {
      try {
        state.assetData = JSON.parse(saved);
      } catch (e) {
        console.error('加载素材数据失败:', e);
        state.assetData = {};
      }
    }
  };

  const renderCategories = () => {
    const container = document.querySelector(`[data-section="assets"] .sia-sub-options`);
    if (!container) return;

    // 移除除了添加按钮外的所有分类按钮
    container.querySelectorAll('.sia-sub-option:not(.add-btn)').forEach(btn => btn.remove());

    // 添加分类按钮
    Object.keys(state.assetData).forEach(categoryName => {
      const btn = document.createElement('button');
      btn.className = 'sia-sub-option';
      btn.dataset.category = categoryName;
      btn.textContent = categoryName;
      btn.addEventListener('click', () => switchAssetCategory(categoryName));

      // 添加删除和编辑按钮
      const editBtn = document.createElement('span');
      editBtn.innerHTML = ' ➕';
      editBtn.style.cursor = 'pointer';
      editBtn.title = '添加素材';
      editBtn.addEventListener('click', e => {
        e.stopPropagation();
        openAssetModal(categoryName);
      });

      const deleteBtn = document.createElement('span');
      deleteBtn.innerHTML = ' 🗑️';
      deleteBtn.style.cursor = 'pointer';
      deleteBtn.title = '删除分类';
      deleteBtn.addEventListener('click', e => {
        e.stopPropagation();
        deleteCategory(categoryName);
      });

      btn.appendChild(editBtn);
      btn.appendChild(deleteBtn);
      container.appendChild(btn);
    });
  };

  const switchAssetCategory = categoryName => {
    state.currentCategory = categoryName;

    // 更新分类按钮状态
    document.querySelectorAll('[data-category]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === categoryName);
    });

    renderAssets(categoryName);
  };

  const renderAssets = categoryName => {
    if (!elements.assetsGrid) return;

    elements.assetsGrid.innerHTML = '';

    const assets = state.assetData[categoryName] || [];

    if (assets.length === 0) {
      elements.assetsGrid.innerHTML = '<div class="sia-grid-placeholder">此分类暂无素材</div>';
      return;
    }

    assets.forEach((asset, index) => {
      const item = document.createElement('div');
      item.className = 'sia-grid-item';
      item.title = asset.desc;
      item.innerHTML = `
        <div style="padding: 8px; text-align: center; font-size: 12px; background: white; height: 100%; display: flex; align-items: center; justify-content: center; word-break: break-all;">
          ${asset.desc}
        </div>
        <button class="delete-btn" title="删除">×</button>
      `;

      // 选择素材
      item.addEventListener('click', e => {
        if (e.target.classList.contains('delete-btn')) return;

        document.querySelectorAll('.sia-grid-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        state.selectedAsset = asset;
      });

      // 删除素材
      item.querySelector('.delete-btn').addEventListener('click', e => {
        e.stopPropagation();
        if (confirm(`确定删除素材"${asset.desc}"吗？`)) {
          state.assetData[categoryName].splice(index, 1);
          saveAssetData();
          renderAssets(categoryName);
        }
      });

      elements.assetsGrid.appendChild(item);
    });
  };

  const deleteCategory = categoryName => {
    if (confirm(`确定删除分类"${categoryName}"及其所有素材吗？`)) {
      delete state.assetData[categoryName];
      saveAssetData();
      renderCategories();

      // 如果删除的是当前分类，清空显示
      if (state.currentCategory === categoryName) {
        state.currentCategory = '';
        elements.assetsGrid.innerHTML = '<div class="sia-grid-placeholder">请选择一个分类</div>';
      }
    }
  };

  // 模态框管理
  const openModal = modalId => {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  };

  const closeModal = modalId => {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  };

  const openAssetModal = categoryName => {
    state.currentCategory = categoryName;
    elements.assetModalTitle.textContent = `为"${categoryName}"添加素材`;
    elements.assetContentInput.value = '';
    openModal('sia-asset-modal');
    elements.assetContentInput.focus();
  };

  // 面板显示/隐藏
  const showPanel = () => {
    if (elements.mainPanel.classList.contains('active')) return;

    const buttonRect = elements.triggerButton.getBoundingClientRect();
    const panelWidth = elements.mainPanel.offsetWidth || 380;
    const panelHeight = elements.mainPanel.offsetHeight || 500;

    // 检测是否为移动设备
    const isMobile = window.innerWidth <= 768;

    let top, left;

    if (isMobile) {
      // 移动设备居中显示
      left = Math.max(10, (window.innerWidth - panelWidth) / 2);
      top = Math.max(10, (window.innerHeight - panelHeight) / 2);
    } else {
      // 桌面设备智能定位
      left = buttonRect.left - panelWidth - 10;
      if (left < 10) {
        left = buttonRect.right + 10;
      }
      if (left + panelWidth > window.innerWidth - 10) {
        left = window.innerWidth - panelWidth - 10;
      }

      top = buttonRect.top;
      if (top + panelHeight > window.innerHeight - 10) {
        top = window.innerHeight - panelHeight - 10;
      }
      if (top < 10) {
        top = 10;
      }
    }

    elements.mainPanel.style.left = `${left}px`;
    elements.mainPanel.style.top = `${top}px`;
    elements.mainPanel.classList.add('active');

    // 添加动画类
    elements.mainPanel.classList.add('sia-animate-bounce');
    setTimeout(() => {
      elements.mainPanel.classList.remove('sia-animate-bounce');
    }, 600);
  };

  const hidePanel = () => {
    elements.mainPanel.classList.remove('active');
    if (elements.emojiPicker.style.display === 'block') {
      elements.emojiPicker.style.display = 'none';
    }
  };

  // 获取当前输入内容
  const getCurrentInput = () => {
    switch (state.currentTab) {
      case 'message':
        return elements.messageInput.value.trim();
      case 'media':
        return elements.mediaInput.value.trim();
      case 'action':
        return elements.actionInput.value.trim();
      case 'assets':
        return state.selectedAsset ? state.selectedAsset.content : '';
      default:
        return '';
    }
  };

  // 清空当前输入
  const clearCurrentInput = () => {
    switch (state.currentTab) {
      case 'message':
        elements.messageInput.value = '';
        break;
      case 'media':
        elements.mediaInput.value = '';
        break;
      case 'action':
        elements.actionInput.value = '';
        break;
    }
  };

  // 格式化并插入内容
  const formatAndInsert = () => {
    let content = getCurrentInput();

    if (!content && state.currentTab !== 'assets') {
      alert('请输入内容！');
      return;
    }

    let formattedContent = '';

    if (state.currentTab === 'assets' && state.selectedAsset) {
      formattedContent = state.selectedAsset.content;
    } else {
      const template = FORMAT_TEMPLATES[state.currentTab]?.[state.currentSubType];
      if (template) {
        if (template.includes('{timestamp}')) {
          const now = new Date();
          const timestamp = now.toLocaleTimeString('zh-CN', { hour12: false });
          formattedContent = template.replace('{timestamp}', timestamp);
        } else {
          formattedContent = template.replace('{content}', content);
        }
      } else {
        formattedContent = content;
      }
    }

    if (insertText(formattedContent)) {
      clearCurrentInput();
      state.selectedAsset = null;

      // 清除选中状态
      document.querySelectorAll('.sia-grid-item.selected').forEach(item => {
        item.classList.remove('selected');
      });

      // 显示成功动画
      elements.insertBtn.style.transform = 'scale(1.1)';
      setTimeout(() => {
        elements.insertBtn.style.transform = '';
      }, 200);
    }
  };

  // 保存面板位置
  const savePanelPosition = (top, left) => {
    localStorage.setItem('sia_panel_position', JSON.stringify({ top, left }));
  };

  // 加载面板位置
  const loadPanelPosition = () => {
    const saved = localStorage.getItem('sia_panel_position');
    if (saved) {
      try {
        const position = JSON.parse(saved);
        if (position.top && position.left) {
          elements.mainPanel.style.top = position.top;
          elements.mainPanel.style.left = position.left;
        }
      } catch (e) {
        console.error('加载面板位置失败:', e);
      }
    }
  };

  // 拖拽功能
  const initDragFunctionality = () => {
    const dragHandle = elements.mainPanel.querySelector('.sia-panel-header');

    dragHandle.addEventListener('mousedown', e => {
      if (e.button !== 0) return;

      const rect = elements.mainPanel.getBoundingClientRect();
      elements.mainPanel.style.top = `${rect.top}px`;
      elements.mainPanel.style.left = `${rect.left}px`;

      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;

      const onMouseMove = moveEvent => {
        let newLeft = moveEvent.clientX - offsetX;
        let newTop = moveEvent.clientY - offsetY;

        const maxLeft = window.innerWidth - elements.mainPanel.offsetWidth;
        const maxTop = window.innerHeight - elements.mainPanel.offsetHeight;

        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));

        elements.mainPanel.style.left = `${newLeft}px`;
        elements.mainPanel.style.top = `${newTop}px`;
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        savePanelPosition(elements.mainPanel.style.top, elements.mainPanel.style.left);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    // 设置拖拽手柄样式
    dragHandle.style.cursor = 'move';
  };

  // 加载按钮位置
  const loadButtonPosition = () => {
    const saved = localStorage.getItem('sia_button_position');
    if (saved) {
      try {
        const position = JSON.parse(saved);
        if (position.left && position.top) {
          elements.triggerButton.style.position = 'absolute';
          elements.triggerButton.style.left = position.left;
          elements.triggerButton.style.top = position.top;
        }
      } catch (e) {
        console.error('加载按钮位置失败:', e);
      }
    }
  };

  // Emoji功能初始化
  const initEmojiPicker = () => {
    // 延迟初始化emoji picker以确保库已加载
    setTimeout(() => {
      if (elements.emojiPicker && elements.emojiPicker.addEventListener) {
        // Emoji picker点击事件
        elements.emojiPicker.addEventListener('emoji-click', event => {
          const emoji = event.detail.unicode;
          let targetInput = null;

          switch (state.currentTab) {
            case 'message':
              targetInput = elements.messageInput;
              break;
            case 'media':
              targetInput = elements.mediaInput;
              break;
            case 'action':
              targetInput = elements.actionInput;
              break;
          }

          if (targetInput) {
            const { selectionStart, selectionEnd, value } = targetInput;
            const newValue = value.substring(0, selectionStart) + emoji + value.substring(selectionEnd);
            targetInput.value = newValue;
            targetInput.focus();
            targetInput.setSelectionRange(selectionStart + emoji.length, selectionStart + emoji.length);
          }

          elements.emojiPicker.style.display = 'none';
        });
      }
    }, 1000);

    // Emoji按钮点击事件
    elements.emojiBtn.addEventListener('click', e => {
      e.stopPropagation();

      const isVisible = elements.emojiPicker.style.display === 'block';

      if (isVisible) {
        elements.emojiPicker.style.display = 'none';
      } else {
        const btnRect = elements.emojiBtn.getBoundingClientRect();
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
          const pickerWidth = 300;
          const pickerHeight = 350;
          const left = Math.max(10, (window.innerWidth - pickerWidth) / 2);
          const top = Math.max(10, (window.innerHeight - pickerHeight) / 2);
          elements.emojiPicker.style.left = `${left}px`;
          elements.emojiPicker.style.top = `${top}px`;
        } else {
          let top = btnRect.top - 350 - 10;
          if (top < 10) {
            top = btnRect.bottom + 10;
          }
          elements.emojiPicker.style.left = `${btnRect.left}px`;
          elements.emojiPicker.style.top = `${top}px`;
        }

        elements.emojiPicker.style.display = 'block';
      }
    });
  };

  // 事件监听器初始化
  const initEventListeners = () => {
    // 标签页切换
    document.querySelectorAll('.sia-tab').forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // 子选项切换
    document.addEventListener('click', e => {
      if (e.target.classList.contains('sia-sub-option') && e.target.dataset.type) {
        switchSubType(e.target.dataset.type);
      }
    });

    // 按钮事件
    elements.insertBtn.addEventListener('click', formatAndInsert);
    elements.recallBtn.addEventListener('click', () => {
      insertText(FORMAT_TEMPLATES.custom.recall);
    });

    // 分类管理
    elements.addCategoryBtn.addEventListener('click', () => {
      elements.categoryNameInput.value = '';
      openModal('sia-category-modal');
      elements.categoryNameInput.focus();
    });

    // 分类模态框事件
    document.getElementById('sia-cancel-category').addEventListener('click', () => {
      closeModal('sia-category-modal');
    });

    document.getElementById('sia-save-category').addEventListener('click', () => {
      const name = elements.categoryNameInput.value.trim();
      if (!name) {
        alert('请输入分类名称！');
        return;
      }

      if (state.assetData[name]) {
        alert('分类已存在！');
        return;
      }

      state.assetData[name] = [];
      saveAssetData();
      renderCategories();
      closeModal('sia-category-modal');
    });

    // 素材模态框事件
    document.getElementById('sia-cancel-asset').addEventListener('click', () => {
      closeModal('sia-asset-modal');
    });

    document.getElementById('sia-save-asset').addEventListener('click', () => {
      const content = elements.assetContentInput.value.trim();
      if (!content) {
        alert('请输入素材内容！');
        return;
      }

      const lines = content.split('\n').filter(line => line.trim());
      let addedCount = 0;

      lines.forEach(line => {
        const parts = line.split('|');
        if (parts.length >= 2) {
          const desc = parts[0].trim();
          const assetContent = parts.slice(1).join('|').trim();

          if (desc && assetContent) {
            state.assetData[state.currentCategory].push({ desc, content: assetContent });
            addedCount++;
          }
        }
      });

      if (addedCount > 0) {
        saveAssetData();
        if (state.currentCategory) {
          renderAssets(state.currentCategory);
        }
        closeModal('sia-asset-modal');
      } else {
        alert('没有找到有效的素材格式！');
      }
    });

    // 主按钮点击事件
    elements.triggerButton.addEventListener('click', e => {
      e.stopPropagation();
      if (elements.mainPanel.classList.contains('active')) {
        hidePanel();
      } else {
        showPanel();
      }
    });

    // 点击外部关闭面板
    document.addEventListener('click', e => {
      // 关闭主面板
      if (
        elements.mainPanel.classList.contains('active') &&
        !elements.mainPanel.contains(e.target) &&
        !elements.triggerButton.contains(e.target)
      ) {
        hidePanel();
      }

      // 关闭emoji picker
      if (
        elements.emojiPicker.style.display === 'block' &&
        !elements.emojiPicker.contains(e.target) &&
        !elements.emojiBtn.contains(e.target)
      ) {
        elements.emojiPicker.style.display = 'none';
      }

      // 关闭模态框
      if (e.target.classList.contains('sia-modal')) {
        e.target.classList.remove('active');
      }
    });

    // 窗口大小改变时重新定位 - 使用jQuery方式根据记忆
    if (typeof $ !== 'undefined') {
      $(window).on('resize orientationchange', function () {
        if (elements.mainPanel.classList.contains('active')) {
          setTimeout(() => {
            hidePanel();
            showPanel();
          }, 100);
        }

        if (elements.emojiPicker.style.display === 'block') {
          elements.emojiPicker.style.display = 'none';
        }
      });
    } else {
      // 备用方案
      window.addEventListener('resize', function () {
        if (elements.mainPanel.classList.contains('active')) {
          setTimeout(() => {
            hidePanel();
            showPanel();
          }, 100);
        }
      });
    }
  };

  // 初始化插件
  const initialize = () => {
    if (state.isInitialized) return;

    console.log('正在初始化智能输入助手...');

    // 加载Emoji Picker
    loadEmojiPicker();

    // 加载数据
    loadAssetData();
    loadButtonPosition();
    loadPanelPosition();

    // 初始化功能
    initDragFunctionality();
    initEmojiPicker();
    initEventListeners();

    // 初始化UI状态
    switchTab('message');
    updateFormatDisplay();

    state.isInitialized = true;
    console.log('智能输入助手初始化完成！');
  };

  // 启动插件
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
