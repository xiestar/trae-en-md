// 在页面加载完成后执行
console.log("Markdown Copy Helper 扩展已加载");

// 全局变量，用于调试
window.mdHelperDebug = {
  initialized: false,
  buttonsFound: 0,
  lastError: null
};

// 直接拦截原生的复制功能
document.addEventListener('copy', function(e) {
  // 不处理输入框中的复制
  if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
    return;
  }
  
  const selectedText = window.getSelection().toString();
  if (selectedText && selectedText.length > 0) {
    e.preventDefault();
    const plainText = convertMarkdownToPlainText(selectedText);
    e.clipboardData.setData('text/plain', plainText);
    console.log("已处理选中文本复制");
  }
});

// 设置所有复制按钮
function setupAllCopyButtons() {
  try {
    console.log("开始查找复制按钮...");
    
    // 查找所有可能的复制按钮，特别是Deepseek的"复制"按钮
    // 使用标准选择器
    const copyButtons = document.querySelectorAll(
      'button[aria-label="Copy"], button[title="复制"], button.copy-btn, ' +
      '[role="button"][aria-label="Copy"], ' +
      'button.copy, button.copyButton, button[data-copy-btn], ' +
      'button.btn-copy, button.copy-code-button, ' +
      'button[id="复制"]'
    );
    
    console.log(`找到 ${copyButtons.length} 个标准复制按钮`);
    window.mdHelperDebug.buttonsFound += copyButtons.length;
    
    // 处理找到的按钮
    copyButtons.forEach(button => {
      if (!button.hasAttribute('data-md-helper-processed')) {
        button.setAttribute('data-md-helper-processed', 'true');
        
        // 直接添加点击事件，不替换按钮
        button.addEventListener('click', function(e) {
          console.log("复制按钮被点击", e.target);
          
          // 查找内容
          const container = findContentContainer(button);
          if (container) {
            processAndCopyContent(container);
          } else {
            console.error("找不到内容容器");
          }
        }, true);
        
        console.log("已为复制按钮添加事件监听器:", button.outerHTML.substring(0, 100));
      }
    });
    
    // 单独处理包含"复制"文本的按钮
    const allButtons = document.querySelectorAll('button');
    let textButtonsFound = 0;
    
    allButtons.forEach(button => {
      // 检查按钮文本是否包含"复制"
      if (!button.hasAttribute('data-md-helper-processed') && 
          button.textContent && 
          (button.textContent.includes('复制') || button.textContent.includes('拷贝'))) {
        button.setAttribute('data-md-helper-processed', 'true');
        textButtonsFound++;
        
        // 直接添加点击事件
        button.addEventListener('click', function(e) {
          console.log("文本包含'复制'的按钮被点击", e.target);
          
          // 延迟执行，让原始复制操作先完成
          setTimeout(() => {
            // 从剪贴板读取内容
            navigator.clipboard.readText().then(text => {
              if (text) {
                console.log("从剪贴板读取到内容:", text.substring(0, 100) + "...");
                
                // 转换为纯文本
                const plainText = convertMarkdownToPlainText(text);
                
                // 写回剪贴板
                navigator.clipboard.writeText(plainText).then(() => {
                  console.log("已将处理后的内容写回剪贴板");
                  showToast("已转换为纯文本格式");
                });
              }
            }).catch(err => {
              console.error("读取剪贴板失败:", err);
              
              // 如果读取剪贴板失败，尝试从DOM获取内容
              const container = findContentContainer(button);
              if (container) {
                processAndCopyContent(container);
              }
            });
          }, 100);
        }, true);
        
        console.log("已为文本包含'复制'的按钮添加事件监听器:", button.outerHTML.substring(0, 100));
      }
    });
    
    console.log(`找到 ${textButtonsFound} 个文本包含'复制'的按钮`);
    window.mdHelperDebug.buttonsFound += textButtonsFound;
    
    // 特别处理Deepseek网站
    if (window.location.href.includes("deepseek")) {
      console.log("检测到Deepseek网站，应用特殊处理");
      
      // 直接查找所有SVG图标，可能是复制按钮
      const svgElements = document.querySelectorAll('svg');
      let svgButtonsFound = 0;
      
      svgElements.forEach(svg => {
        const button = svg.closest('button') || svg.parentElement;
        if (button && !button.hasAttribute('data-md-helper-processed')) {
          button.setAttribute('data-md-helper-processed', 'true');
          svgButtonsFound++;
          
          // 为所有可能的按钮添加点击事件
          button.addEventListener('click', function(e) {
            console.log("SVG按钮被点击:", button.outerHTML.substring(0, 100));
            
            // 延迟执行，让原始复制操作先完成
            setTimeout(() => {
              // 从剪贴板读取内容
              navigator.clipboard.readText().then(text => {
                if (text) {
                  console.log("从剪贴板读取到内容:", text.substring(0, 100) + "...");
                  
                  // 转换为纯文本
                  const plainText = convertMarkdownToPlainText(text);
                  
                  // 写回剪贴板
                  navigator.clipboard.writeText(plainText).then(() => {
                    console.log("已将处理后的内容写回剪贴板");
                    showToast("已转换为纯文本格式");
                  });
                }
              }).catch(err => {
                console.error("读取剪贴板失败:", err);
              });
            }, 100);
          }, true);
        }
      });
      
      console.log(`处理了 ${svgButtonsFound} 个SVG按钮`);
      
      // 添加全局剪贴板监听
      document.addEventListener('click', function(e) {
        // 延迟执行，让原始复制操作先完成
        setTimeout(() => {
          // 从剪贴板读取内容
          navigator.clipboard.readText().then(text => {
            if (text && text.includes('```') || text.includes('**') || text.includes('__')) {
              console.log("检测到剪贴板中的Markdown内容");
              
              // 转换为纯文本
              const plainText = convertMarkdownToPlainText(text);
              
              // 写回剪贴板
              navigator.clipboard.writeText(plainText).then(() => {
                console.log("已将处理后的内容写回剪贴板");
                showToast("已转换为纯文本格式");
              });
            }
          }).catch(err => {
            // 忽略错误
          });
        }, 300);
      }, true);
    }
    
  } catch (err) {
    console.error("设置复制按钮时出错:", err);
    window.mdHelperDebug.lastError = err.toString();
  }
}

// 处理并复制内容
function processAndCopyContent(container) {
  // 获取原始文本
  let text = container.innerText || container.textContent;
  if (!text || text.length === 0) {
    console.error("获取内容失败");
    return;
  }
  
  console.log("获取到的原始文本:", text.substring(0, 100) + "...");
  
  // 转换 Markdown 为纯文本
  let plainText = convertMarkdownToPlainText(text);
  
  // 写入剪贴板
  try {
    // 使用同步方法
    const textArea = document.createElement("textarea");
    textArea.value = plainText;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    
    console.log('内容已转换为纯文本并复制到剪贴板');
    showToast("已复制为纯文本");
    
    // 调试输出
    console.log("原始文本前100个字符:", text.substring(0, 100));
    console.log("处理后文本前100个字符:", plainText.substring(0, 100));
  } catch (err) {
    console.error('复制失败，尝试使用异步API:', err);
    
    // 尝试使用异步API
    navigator.clipboard.writeText(plainText).then(() => {
      console.log('内容已通过异步API复制到剪贴板');
      showToast("已复制为纯文本");
    }).catch(err => {
      console.error('异步复制也失败:', err);
    });
  }
}

// 查找内容容器 - 增强版
function findContentContainer(button) {
  // 尝试多种可能的容器选择器
  const possibleContainers = [
    button.closest('.markdown-body'),
    button.closest('.answer-content'),
    button.closest('pre'),
    button.closest('.message-content'),
    button.closest('.deepseek-message'),
    button.closest('.message'),
    button.closest('.code-block-wrapper'),
    button.closest('code'),
    button.closest('div[role="presentation"]'),
    // 添加更多Deepseek特定的选择器
    button.closest('.message-bubble'),
    button.closest('.message-body'),
    button.closest('.message-content-wrapper'),
    button.closest('.deepseek-markdown')
  ];
  
  for (const container of possibleContainers) {
    if (container) {
      console.log("找到容器:", container.className || container.tagName);
      return container;
    }
  }
  
  // 如果找不到特定容器，尝试查找最近的包含文本的父元素
  let parent = button.parentElement;
  let maxDepth = 10; // 限制向上查找的层级
  let depth = 0;
  
  while (parent && parent !== document.body && depth < maxDepth) {
    if (parent.innerText && parent.innerText.length > 50) {
      console.log("通过父元素查找到容器:", parent.className || parent.tagName);
      return parent;
    }
    parent = parent.parentElement;
    depth++;
  }
  
  // 最后尝试查找按钮附近的内容
  const buttonRect = button.getBoundingClientRect();
  const nearbyElements = document.elementsFromPoint(
    buttonRect.left - 50, 
    buttonRect.top
  );
  
  for (const element of nearbyElements) {
    if (element !== button && 
        element.innerText && 
        element.innerText.length > 50 && 
        !element.contains(button)) {
      console.log("通过位置查找到容器:", element.className || element.tagName);
      return element;
    }
  }
  
  return null;
}

// 转换 Markdown 为纯文本的函数 - 终极版
function convertMarkdownToPlainText(markdown) {
  if (!markdown) return '';
  
  let plainText = markdown;
  
  // 移除所有不可见字符
  plainText = plainText.replace(/[\u200B-\u200F\uFEFF\u00A0]/g, '');
  
  // 处理代码块 - 保留内容但移除标记
  plainText = plainText.replace(/```(?:\w+)?\s*\n([\s\S]*?)\n```/g, function(match, codeContent) {
    return '\n' + codeContent.trim() + '\n';
  });
  
  // 处理 Markdown 格式
  plainText = plainText
    // 移除行内代码标记
    .replace(/`([^`]+)`/g, '$1')
    // 移除标题标记
    .replace(/^#{1,6}\s+(.+)$/gm, '$1')
    // 移除粗体和斜体标记
    .replace(/(\*\*|__)([\s\S]*?)\1/g, '$2')
    .replace(/(\*|_)([\s\S]*?)\1/g, '$2')
    // 移除链接标记
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    // 移除图片标记
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // 移除HTML标签
    .replace(/<[^>]*>/g, '')
    // 移除列表标记
    .replace(/^[\*\-\+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    // 移除引用标记
    .replace(/^>\s+/gm, '')
    // 移除水平线
    .replace(/^-{3,}|_{3,}|\*{3,}$/gm, '')
    // 移除表格格式
    .replace(/\|/g, ' ')
    .replace(/^[:\-\| ]+$/gm, '')
    // 移除转义字符
    .replace(/\\([\\`*_{}[\]()#+\-.!])/g, '$1')
    // 处理特殊字符
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    // 统一换行符并移除多余空行
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
  
  // 移除每行开头和结尾的空白字符
  plainText = plainText.split('\n').map(line => line.trim()).join('\n');
  
  // 移除文本开头和结尾的空白字符
  plainText = plainText.trim();
  
  return plainText;
}

// 显示提示消息
function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.backgroundColor = '#4CAF50';
  toast.style.color = 'white';
  toast.style.padding = '10px 20px';
  toast.style.borderRadius = '5px';
  toast.style.zIndex = '10000';
  toast.style.opacity = '0';
  toast.style.transition = 'opacity 0.3s';
  
  document.body.appendChild(toast);
  
  // 显示提示
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 10);
  
  // 2秒后隐藏提示
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 2000);
}

// 监听DOM变化
const observer = new MutationObserver(function() {
  setupAllCopyButtons();
});

// 配置观察选项
const config = { childList: true, subtree: true };
// 开始观察文档变化
observer.observe(document.body, config);

// 初始设置页面上已有的复制按钮
setTimeout(() => {
  try {
    setupAllCopyButtons();
    console.log("初始化完成");
    
    // 添加全局调试信息
    console.log("当前页面URL:", window.location.href);
    console.log("扩展已激活");
    
    // 显示一个提示，确认扩展已加载
    showToast("Markdown复制助手已加载");
    
    window.mdHelperDebug.initialized = true;
    
    // 添加调试按钮
    const debugButton = document.createElement('button');
    debugButton.textContent = "MD助手调试";
    debugButton.style.position = 'fixed';
    debugButton.style.bottom = '10px';
    debugButton.style.left = '10px';
    debugButton.style.zIndex = '10000';
    debugButton.style.padding = '5px 10px';
    debugButton.style.backgroundColor = '#f0f0f0';
    debugButton.style.border = '1px solid #ccc';
    debugButton.style.borderRadius = '4px';
    
    debugButton.addEventListener('click', function() {
      console.log("MD助手调试信息:", window.mdHelperDebug);
      console.log("当前页面按钮数量:", document.querySelectorAll('button').length);
      console.log("已处理按钮数量:", document.querySelectorAll('[data-md-helper-processed]').length);
      
      // 手动触发剪贴板处理
      navigator.clipboard.readText().then(text => {
        if (text) {
          console.log("当前剪贴板内容:", text.substring(0, 100) + "...");
          const plainText = convertMarkdownToPlainText(text);
          navigator.clipboard.writeText(plainText).then(() => {
            showToast("已处理剪贴板内容");
          });
        }
      }).catch(err => {
        console.error("读取剪贴板失败:", err);
      });
      
      // 重新扫描按钮
      setupAllCopyButtons();
      
      showToast("已刷新按钮处理");
    });
    
    document.body.appendChild(debugButton);
    
    // 添加一个直接复制按钮
    const copyButton = document.createElement('button');
    copyButton.textContent = "复制为纯文本";
    copyButton.style.position = 'fixed';
    copyButton.style.bottom = '10px';
    copyButton.style.left = '110px';
    copyButton.style.zIndex = '10000';
    copyButton.style.padding = '5px 10px';
    copyButton.style.backgroundColor = '#4CAF50';
    copyButton.style.color = 'white';
    copyButton.style.border = '1px solid #ccc';
    copyButton.style.borderRadius = '4px';
    
    copyButton.addEventListener('click', function() {
      // 获取当前页面的所有文本
      const allText = document.body.innerText;
      const plainText = convertMarkdownToPlainText(allText);
      
      navigator.clipboard.writeText(plainText).then(() => {
        showToast("已复制页面内容为纯文本");
      });
    });
    
    document.body.appendChild(copyButton);
    
  } catch (err) {
    console.error("初始化失败:", err);
    window.mdHelperDebug.lastError = err.toString();
  }
}, 1000);

// 定期检查新的复制按钮
setInterval(setupAllCopyButtons, 3000);

// 添加全局快捷键支持
document.addEventListener('keydown', function(e) {
  // Ctrl+Shift+C 快捷键
  if (e.ctrlKey && e.shiftKey && e.key === 'C') {
    console.log("检测到快捷键: Ctrl+Shift+C");
    // 获取选中的文本
    const selectedText = window.getSelection().toString();
    if (selectedText) {
      // 转换为纯文本
      const plainText = convertMarkdownToPlainText(selectedText);
      
      // 写入剪贴板
      navigator.clipboard.writeText(plainText).then(() => {
        showToast("已复制为纯文本");
      });
      
      e.preventDefault();
    }
  }
});