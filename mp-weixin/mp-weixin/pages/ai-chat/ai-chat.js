// pages/ai-chat/ai-chat.js
Page({
  data: {
    messages: [],
    inputMessage: '',
    sessionId: '',
    isLoading: false,
    scrollToView: '',
    showQuickQuestions: false,
    quickQuestions: [
      '今天有什么推荐菜品？',
      '配送范围是多大？',
      '如何修改订单？',
      '支持哪些支付方式？',
      '怎么查看订单状态？'
    ],
    currentAiMessageId: null
  },

  onLoad: function (options) {
    // 生成会话ID
    this.setData({
      sessionId: 'session_' + Date.now()
    });
  },

  // 返回上一页
  goBack: function() {
    wx.navigateBack({
      delta: 1
    });
  },

  // 发送快捷问题
  sendQuickQuestion: function(e) {
    const question = e.currentTarget.dataset.question;
    this.setData({ inputMessage: question });
    this.sendMessage();
  },

  // 清空输入
  clearInput: function() {
    this.setData({ inputMessage: '' });
  },

  // 输入框内容变化
  onInputChange: function (e) {
    this.setData({ inputMessage: e.detail.value });
  },

  // 发送消息
  sendMessage: function () {
    const message = this.data.inputMessage.trim();
    if (!message || this.data.isLoading) return;

    // 添加用户消息
    const userMsgId = 'msg_' + Date.now();
    const userMessage = {
      id: userMsgId,
      type: 'user',
      content: message,
      time: this.formatTime()
    };

    this.setData({
      messages: [...this.data.messages, userMessage],
      inputMessage: '',
      isLoading: true,
      scrollToView: 'msg-' + userMsgId
    });

    // 添加AI消息占位（用于流式显示）
    const aiMsgId = 'msg_' + (Date.now() + 1);
    const aiMessage = {
      id: aiMsgId,
      type: 'ai',
      content: '',
      time: this.formatTime(),
      isStreaming: true
    };

    this.setData({
      messages: [...this.data.messages, aiMessage],
      currentAiMessageId: aiMsgId,
      scrollToView: 'msg-' + aiMsgId
    });

    // 使用SSE方式请求
    this.requestSSE(message);
  },

  // 获取基础URL
  getBaseUrl: function() {
    // 优先使用全局配置的baseUrl
    if (getApp() && getApp().globalData && getApp().globalData.baseUrl) {
      return getApp().globalData.baseUrl;
    }
    // 默认使用本地开发地址
    return 'http://localhost:8080';
  },

  // SSE流式请求
  requestSSE: function(message) {
    const that = this;
    
    // 实际请求
    const baseUrl = this.getBaseUrl();
    const requestTask = wx.request({
      url: baseUrl + '/user/ai/chat',
      method: 'POST',
      data: {
        message: message,
        sessionId: this.data.sessionId
      },
      header: {
        'content-type': 'application/json'
      },
      success: function(res) {
        // 处理完整响应
        if (res.statusCode === 200 && res.data) {
          console.log('后端响应:', res.data);
          that.handleStreamData(res.data);
          that.finishStreaming();
        } else if (res.statusCode === 500) {
          console.error('服务器内部错误:', res);
          that.showError('AI服务暂时不可用，请稍后再试');
        } else {
          that.showError('服务暂时不可用，请稍后再试');
        }
      },
      fail: function(err) {
        console.error('请求失败:', err);
        // 失败时使用模拟数据（用于测试）
        const mockResponse = {
          content: '您好！我是智能客服助手，很高兴为您服务。\n\n关于您的问题，我可以提供以下信息：\n1. 我们的推荐菜品包括招牌红烧肉、清蒸鱼和宫保鸡丁\n2. 配送范围为周边5公里内\n3. 您可以在订单详情页修改订单信息\n4. 我们支持微信支付、支付宝和现金支付\n5. 您可以在"我的订单"中查看订单状态\n\n请问还有什么可以帮您的吗？'
        };
        console.log('使用模拟数据:', mockResponse);
        that.handleStreamData(mockResponse);
        that.finishStreaming();
      },
      complete: function() {
        // 注意：finishStreaming已在success和fail中调用
      }
    });
  },

  // 处理流式数据
  handleStreamData: function(data) {
    console.log('收到原始数据类型:', typeof data);
    console.log('收到原始数据:', data);
    
    // 确保数据存在
    if (!data) {
      console.log('数据为空，无法处理');
      this.showError('AI服务暂时不可用，请稍后再试');
      return;
    }
    
    // 定义内容变量
    let content = '';
    
    // 处理对象类型数据
    if (typeof data === 'object' && data !== null) {
      console.log('数据是对象，检查结构:');
      console.log('data.result:', data.result);
      console.log('data.result?.output:', data.result?.output);
      console.log('data.result?.output?.text:', data.result?.output?.text);
      console.log('data.text:', data.text);
      console.log('data.content:', data.content);
      console.log('data.choices:', data.choices);
      
      // 尝试多种可能的路径提取内容
      content = this.extractContentFromResponse(data);
      console.log('从对象提取的内容:', content);
    }
    
    // 处理字符串类型数据
    else if (typeof data === 'string') {
      console.log('数据是字符串，长度:', data.length);
      
      // 首先尝试解析为JSON
      try {
        const jsonData = JSON.parse(data);
        console.log('解析为JSON对象:', jsonData);
        content = this.extractContentFromResponse(jsonData);
        console.log('从JSON对象提取到内容:', content);
      } catch (e) {
        console.log('无法解析为JSON，作为纯文本处理:', e.message);
        // 直接使用字符串作为内容
        content = data;
        // 去除可能的首尾引号
        if ((content.startsWith('"') && content.endsWith('"')) ||
            (content.startsWith("'") && content.endsWith("'"))) {
          content = content.slice(1, -1);
        }
        // 尝试处理Unicode转义字符
        try {
          content = JSON.parse('"' + content + '"');
        } catch (e2) {
          // 解析失败，保持原样
        }
      }
    }
    
    // 如果提取到内容，更新AI消息
    if (content) {
      console.log('最终提取的内容:', content);
      this.updateAiMessage(content);
    } else {
      console.log('未提取到任何内容，显示错误信息');
      this.showError('AI服务暂时不可用，请稍后再试');
    }
  },

  // 从响应对象中提取内容
  extractContentFromResponse: function(jsonData) {
    // 尝试多种可能的路径
    console.log('尝试从响应对象提取内容:', jsonData);
    
    // 直接返回text字段（简单格式）
    if (jsonData.text) {
      console.log('提取到text字段:', jsonData.text);
      return jsonData.text;
    }
    
    // 直接返回content字段（简单格式）
    if (jsonData.content) {
      console.log('提取到content字段:', jsonData.content);
      return jsonData.content;
    }
    
    // Spring AI 格式: result.output.text
    if (jsonData.result && jsonData.result.output && jsonData.result.output.text) {
      console.log('提取到Spring AI格式: result.output.text');
      return jsonData.result.output.text;
    }
    
    // Spring AI 格式: result.output.message.content
    if (jsonData.result && jsonData.result.output && jsonData.result.output.message && jsonData.result.output.message.content) {
      console.log('提取到Spring AI格式: result.output.message.content');
      return jsonData.result.output.message.content;
    }
    
    // results数组格式
    if (jsonData.results && jsonData.results[0] && jsonData.results[0].output && jsonData.results[0].output.text) {
      console.log('提取到results数组格式');
      return jsonData.results[0].output.text;
    }
    
    // 其他可能的output格式
    if (jsonData.output && jsonData.output.text) {
      console.log('提取到output.text');
      return jsonData.output.text;
    }
    
    if (jsonData.output && jsonData.output.message && jsonData.output.message.content) {
      console.log('提取到output.message.content');
      return jsonData.output.message.content;
    }
    
    // 其他可能的message格式
    if (jsonData.message && jsonData.message.content) {
      console.log('提取到message.content');
      return jsonData.message.content;
    }
    
    // 其他可能的result格式
    if (jsonData.result && jsonData.result.content) {
      console.log('提取到result.content');
      return jsonData.result.content;
    }
    
    // OpenAI格式: choices[0].message.content
    if (jsonData.choices && jsonData.choices[0] && jsonData.choices[0].message && jsonData.choices[0].message.content) {
      console.log('提取到OpenAI格式: choices[0].message.content');
      return jsonData.choices[0].message.content;
    }
    
    // 尝试从response字段提取
    if (jsonData.response) {
      console.log('尝试从response字段提取');
      if (typeof jsonData.response === 'string') {
        return jsonData.response;
      } else if (jsonData.response.content) {
        return jsonData.response.content;
      } else if (jsonData.response.text) {
        return jsonData.response.text;
      }
    }
    
    console.log('未找到任何匹配的内容格式');
    return null;
  },

  // 更新AI消息内容
  updateAiMessage: function(content) {
    const messages = this.data.messages.map(msg => {
      if (msg.id === this.data.currentAiMessageId) {
        return { ...msg, content: content };
      }
      return msg;
    });

    this.setData({ messages: messages });
  },

  // 完成流式传输
  finishStreaming: function() {
    const messages = this.data.messages.map(msg => {
      if (msg.id === this.data.currentAiMessageId) {
        return { ...msg, isStreaming: false };
      }
      return msg;
    });

    this.setData({
      messages: messages,
      isLoading: false,
      currentAiMessageId: null
    });
  },

  // 显示错误消息
  showError: function(errorMsg) {
    const messages = this.data.messages.map(msg => {
      if (msg.id === this.data.currentAiMessageId) {
        return { ...msg, content: errorMsg, isStreaming: false };
      }
      return msg;
    });

    this.setData({
      messages: messages,
      isLoading: false,
      currentAiMessageId: null
    });
  },

  // 格式化时间
  formatTime: function() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
});
