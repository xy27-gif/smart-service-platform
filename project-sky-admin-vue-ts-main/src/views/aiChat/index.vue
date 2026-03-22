<template>
  <div class="ai-chat-container">
    <div class="chat-header">
      <h2>AI智能客服</h2>
      <button class="clear-btn" @click="clearMessages">清空对话</button>
    </div>
    <div class="chat-messages" ref="messagesContainer">
      <div
        v-for="(message, index) in messages"
        :key="index"
        :class="['message', message.role === 'user' ? 'user-message' : 'ai-message']"
      >
        <div class="message-content" v-html="message.content.replace(/\n/g, '<br>')"></div>
      </div>
    </div>
    <div class="chat-input">
      <input
        v-model="inputMessage"
        type="text"
        placeholder="请输入您的问题..."
        @keyup.enter="sendMessage"
      />
      <button @click="sendMessage" :disabled="isLoading">发送</button>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator';
import request from '@/utils/request';
import { getStoreId } from '@/utils/cookies';
import Cookies from 'js-cookie';

@Component({
  name: 'AiChat'
})
export default class AiChat extends Vue {
  inputMessage = '';
  messages: Array<{ role: string; content: string }> = [];
  sessionId = '';
  isLoading = false;

  generateSessionId() {
    const storeId = getStoreId();
    if (storeId) {
      return 'session_' + storeId;
    }
    // 如果没有storeId，使用用户名作为备用标识
    const username = Cookies.get('username');
    if (username) {
      return 'session_' + username;
    }
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  sendMessage() {
    if (!this.inputMessage.trim() || this.isLoading) return;

    const userMessage = this.inputMessage.trim();
    this.messages.push({ role: 'user', content: userMessage });
    this.inputMessage = '';
    this.scrollToBottom();
    this.saveMessages();

    this.isLoading = true;

    // 调用后端API
    request
      .post('/ai/chat', {
        message: userMessage,
        sessionId: this.sessionId
      })
      .then(response => {
        let aiResponse = response.data || '抱歉，未能获取到回复。';
        
        // 解析SSE格式响应
        if (typeof aiResponse === 'string') {
          // 移除data前缀和换行符
          aiResponse = aiResponse.replace(/data:/g, '').replace(/\n/g, '').trim();
          
          // 尝试解析JSON字符串
          try {
            // 尝试直接解析JSON
            try {
              aiResponse = JSON.parse(aiResponse);
              if (typeof aiResponse === 'string') {
                // 解析成功，使用解析后的值
              }
            } catch (jsonError) {
              // JSON解析失败，继续处理字符串
            }
            
            // 确保aiResponse是字符串
            if (typeof aiResponse === 'string') {
              // 移除首尾双引号
              if (aiResponse.startsWith('"') && aiResponse.endsWith('"')) {
                aiResponse = aiResponse.substring(1, aiResponse.length - 1);
              }
              
              // 处理转义字符
              aiResponse = aiResponse
                .replace(/\\n/g, '\n') // 替换换行符
                .replace(/\\"/g, '"') // 替换双引号
                .replace(/\\'/g, "'") // 替换单引号
                .replace(/\\\\/g, '\\'); // 替换反斜杠
              
              // 处理多余的双引号（连续的双引号替换为单个双引号）
              aiResponse = aiResponse.replace(/""+/g, '"');
              
              // 处理句子中的多余双引号（保留对话中的双引号，移除其他多余的）
              aiResponse = aiResponse.replace(/([^"'])("+)([^"'])/g, '$1 $3');
              
              // 处理多余的空格（保留换行符）
              aiResponse = aiResponse.replace(/[ \t]+/g, ' ').trim();
              
              // 解码Unicode转义序列（包括表情符号）
              aiResponse = aiResponse.replace(/\\u([0-9a-fA-F]{4})/g, function (match, hex) {
                return String.fromCharCode(parseInt(hex, 16));
              });
              
              // 再次解码确保所有Unicode字符正确显示
              try {
                aiResponse = decodeURIComponent(escape(aiResponse));
              } catch (e) {
                // 忽略解码错误
              }
            }
          } catch (e) {
            console.error('Error processing response:', e);
          }
        }
        
        // 确保aiResponse是字符串
        if (typeof aiResponse !== 'string') {
          aiResponse = String(aiResponse);
        }
        
        this.messages.push({ role: 'assistant', content: aiResponse });
        this.scrollToBottom();
        this.saveMessages();
      })
      .catch(error => {
        console.error('Error sending message:', error);
        this.messages.push({ role: 'assistant', content: '抱歉，服务暂时不可用，请稍后再试。' });
        this.scrollToBottom();
        this.saveMessages();
      })
      .finally(() => {
        this.isLoading = false;
      });
  }

  scrollToBottom() {
    this.$nextTick(() => {
      const container = this.$refs.messagesContainer as HTMLElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });
  }

  saveMessages() {
    try {
      // 使用与用户相关的键名存储消息
      const localStorageKey = 'aiChatMessages_' + this.sessionId;
      localStorage.setItem(localStorageKey, JSON.stringify(this.messages));
    } catch (error) {
      console.error('Error saving messages:', error);
    }
  }

  loadMessages() {
    try {
      // 首先根据当前登录用户生成sessionId
      this.sessionId = this.generateSessionId();
      
      // 使用与用户相关的键名存储消息
      const localStorageKey = 'aiChatMessages_' + this.sessionId;
      const savedMessages = localStorage.getItem(localStorageKey);
      if (savedMessages) {
        this.messages = JSON.parse(savedMessages);
      } else {
        // 初始欢迎消息
        this.messages = [{ role: 'assistant', content: '您好！我是AI智能客服，有什么可以帮您的吗？' }];
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      this.messages = [{ role: 'assistant', content: '您好！我是AI智能客服，有什么可以帮您的吗？' }];
      this.sessionId = this.generateSessionId();
    }
  }

  clearMessages() {
    this.messages = [{ role: 'assistant', content: '您好！我是AI智能客服，有什么可以帮您的吗？' }];
    // 清除与当前用户相关的消息
    const localStorageKey = 'aiChatMessages_' + this.sessionId;
    localStorage.removeItem(localStorageKey);
  }

  mounted() {
    this.loadMessages();
  }
}
</script>

<style scoped>
.ai-chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.chat-header {
  padding: 20px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  h2 {
    margin: 0;
    font-size: 18px;
    color: #303133;
  }
  
  .clear-btn {
    padding: 6px 12px;
    background: #f56c6c;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    
    &:hover {
      background: #f78989;
    }
  }
}

.chat-messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: #fafafa;
}

.message {
  margin-bottom: 16px;
  max-width: 80%;
  
  &.user-message {
    margin-left: auto;
    .message-content {
      background: #409eff;
      color: white;
      border-radius: 18px 18px 0 18px;
    }
  }
  
  &.ai-message {
    margin-right: auto;
    .message-content {
      background: white;
      color: #303133;
      border-radius: 18px 18px 18px 0;
      border: 1px solid #e4e7ed;
    }
  }
}

.message-content {
  padding: 12px 16px;
  word-wrap: break-word;
  line-height: 1.5;
}

.chat-input {
  padding: 16px;
  border-top: 1px solid #e4e7ed;
  display: flex;
  gap: 10px;
  
  input {
    flex: 1;
    padding: 10px 15px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    font-size: 14px;
    
    &:focus {
      outline: none;
      border-color: #409eff;
      box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
    }
  }
  
  button {
    padding: 0 20px;
    background: #409eff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    
    &:hover {
      background: #66b1ff;
    }
    
    &:disabled {
      background: #c0c4cc;
      cursor: not-allowed;
    }
  }
}
</style>