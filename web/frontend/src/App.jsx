import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  List,
  ListItem,
  Snackbar,
  IconButton,
  Avatar,
  useTheme,
  Tooltip,
  useMediaQuery,
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SendIcon from '@mui/icons-material/Send';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const chatBoxRef = useRef(null);
  const inputRef = useRef(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const messageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  };

  // 可以針對最外層做「佔滿螢幕、垂直排列」的設定
  const styles = {
    pageContainer: {
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: theme.palette.mode === 'dark' ? '#121212' : '#f7f9fc',
      transition: 'background-color 0.3s ease',
    },
    // 中間主要可伸縮、可捲動的聊天區
    centerArea: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden', // 關鍵：確保只會在內層滾動
    },
    suggestionChips: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 1,
      p: 2,
      justifyContent: 'center',
      flexShrink: 0, // 不要讓建議選單撐大或被擠壓
    },
    // wrap 一層，把真正的「訊息列表」做 overflow: auto
    chatContainer: {
      flex: 1,
      overflowY: 'auto',
      padding: theme.spacing(2),
      scrollBehavior: 'smooth',
      scrollbarWidth: 'thin',
      '&::-webkit-scrollbar': {
        width: '6px',
      },
      '&::-webkit-scrollbar-thumb': {
        backgroundColor:
          theme.palette.mode === 'dark'
            ? 'rgba(255,255,255,0.2)'
            : 'rgba(0,0,0,0.2)',
        borderRadius: '4px',
      },
      '&::-webkit-scrollbar-track': {
        backgroundColor: 'transparent',
      },
      // 避免手機上方輸入框擋住最後訊息
      paddingBottom: isMobile ? '140px' : '100px',
    },
    messageUser: {
      display: 'flex',
      width: '100%',
      justifyContent: 'flex-end',
      mb: 1,
      position: 'relative',
    },
    messageBot: {
      display: 'flex',
      width: '100%',
      justifyContent: 'flex-start',
      mb: 1,
      position: 'relative',
    },
    messageBubbleUser: {
      maxWidth: '70%',
      backgroundColor: theme.palette.primary.main,
      color: 'white',
      padding: theme.spacing(1.5, 2),
      borderRadius: '18px 18px 0px 18px',
      wordBreak: 'break-word',
      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
      overflowWrap: 'anywhere',
    },
    messageBubbleBot: {
      maxWidth: '70%',
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary,
      padding: theme.spacing(1.5, 2),
      borderRadius: '18px 18px 18px 0px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
      wordBreak: 'break-word',
      border: `1px solid ${theme.palette.divider}`,
      overflowWrap: 'anywhere',
    },
    messageTime: {
      fontSize: '0.7rem',
      color: theme.palette.text.secondary,
      marginTop: '4px',
      textAlign: 'right',
    },
    // 最下面的輸入框容器，flexShrink: 0 代表它不會被擠壓
    inputContainer: {
      flexShrink: 0,
      p: theme.spacing(1.5, 2),
      bgcolor: theme.palette.background.paper,
      borderTop: `1px solid ${theme.palette.divider}`,
      boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
    },
    inputForm: {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1),
      width: '100%',
      // 如果想要在大螢幕中間對齊，可加上 margin: '0 auto' + maxWidth
      // maxWidth: 900,
      // margin: '0 auto',
    },
    textField: {
      flex: 1,
      borderRadius: '12px',
      '& .MuiOutlinedInput-root': {
        borderRadius: '12px',
        padding: theme.spacing(1, 1.5),
      },
    },
    restartButton: {
      height: 40,
      width: 40,
      minWidth: 40,
      borderRadius: '50%',
      padding: 0,
      transition: 'transform 0.2s ease, background-color 0.2s ease',
    },
    sendButton: {
      height: 40,
      width: 40,
      minWidth: 40,
      borderRadius: '50%',
      padding: 0,
      transition: 'transform 0.2s ease, background-color 0.2s ease',
      '&:active': {
        transform: 'scale(0.95)',
      },
    },
    codeBlock: {
      position: 'relative',
      margin: theme.spacing(1.5, 0),
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor:
        theme.palette.mode === 'dark'
          ? 'rgba(255,255,255,0.05)'
          : 'rgba(0,0,0,0.02)',
      border: `1px solid ${theme.palette.divider}`,
      maxWidth: '100%',
      overflowX: 'auto',
    },
    codeHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing(0.5, 1),
      borderBottom: `1px solid ${theme.palette.divider}`,
    },
    codeLanguage: {
      fontSize: '0.75rem',
      color: theme.palette.text.secondary,
      fontFamily: 'monospace',
    },
    copyButton: {
      padding: 4,
    },
    avatar: {
      marginRight: theme.spacing(1),
      width: 36,
      height: 36,
      backgroundColor: theme.palette.primary.main,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    userAvatar: {
      marginLeft: theme.spacing(1),
      marginRight: 0,
      width: 36,
      height: 36,
      backgroundColor: theme.palette.secondary.main,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    systemMsgContainer: {
      display: 'flex',
      justifyContent: 'center',
      mb: 2,
      mx: 'auto',
      maxWidth: '85%',
    },
    systemMsgBubble: {
      backgroundColor:
        theme.palette.mode === 'dark'
          ? 'rgba(255,255,255,0.05)'
          : 'rgba(0,0,0,0.03)',
      color: theme.palette.text.secondary,
      padding: theme.spacing(1),
      borderRadius: '12px',
      textAlign: 'center',
      fontStyle: 'italic',
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      fontSize: '0.9rem',
    },
  };

  // 建立程式碼區塊組件
  const CodeBlock = ({ className, children }) => {
    const language = className ? className.replace('language-', '') : '';
    const displayLanguage = language || 'text';

    const handleCopy = async () => {
      try {
        const textToCopy = String(children).trim();

        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(textToCopy);
        } else {
          const textArea = document.createElement('textarea');
          textArea.value = textToCopy;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          document.body.appendChild(textArea);
          textArea.select();
          try {
            document.execCommand('copy');
          } finally {
            textArea.remove();
          }
        }
        setCopySuccess(true);
        setSnackbarOpen(true);
      } catch (error) {
        console.error('複製失敗:', error);
        setError('複製失敗，請稍後再試。');
      }
    };

    return (
      <Box sx={styles.codeBlock}>
        <Box sx={styles.codeHeader}>
          <Typography sx={styles.codeLanguage}>{displayLanguage}</Typography>
          <Tooltip title="複製程式碼" placement="top">
            <IconButton
              size="small"
              onClick={handleCopy}
              sx={styles.copyButton}
              aria-label="複製程式碼"
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <SyntaxHighlighter
          language={language}
          style={docco}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: '16px',
            fontSize: '0.9em',
            borderRadius: '0 0 8px 8px',
            overflow: 'auto',
            maxHeight: '400px',
          }}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </Box>
    );
  };

  // 負責把文字轉成 Markdown (含程式碼) 的函式
  const renderMessageContent = (text) => {
    return (
      <ReactMarkdown
        components={{
          code: ({ node, inline, className, children, ...props }) => {
            if (inline) {
              return (
                <code
                  style={{
                    backgroundColor:
                      theme.palette.mode === 'dark'
                        ? 'rgba(255,255,255,0.1)'
                        : 'rgba(0,0,0,0.06)',
                    padding: '2px 4px',
                    borderRadius: '4px',
                    fontSize: '0.875em',
                    fontFamily: '"Roboto Mono", monospace',
                  }}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return <CodeBlock className={className}>{children}</CodeBlock>;
          },
          p: ({ children }) => (
            <Typography
              variant="body1"
              sx={{
                my: 0.75,
                lineHeight: 1.6,
                fontSize: '0.95rem',
              }}
            >
              {children}
            </Typography>
          ),
          h1: ({ children }) => (
            <Typography variant="h5" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
              {children}
            </Typography>
          ),
          h2: ({ children }) => (
            <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
              {children}
            </Typography>
          ),
          h3: ({ children }) => (
            <Typography
              variant="subtitle1"
              sx={{ mt: 1.5, mb: 0.75, fontWeight: 600 }}
            >
              {children}
            </Typography>
          ),
          ul: ({ children }) => (
            <Box component="ul" sx={{ pl: 2, my: 1 }}>
              {children}
            </Box>
          ),
          ol: ({ children }) => (
            <Box component="ol" sx={{ pl: 2, my: 1 }}>
              {children}
            </Box>
          ),
          li: ({ children }) => (
            <Box component="li" sx={{ mb: 0.5 }}>
              <Typography
                variant="body1"
                component="span"
                sx={{ fontSize: '0.95rem' }}
              >
                {children}
              </Typography>
            </Box>
          ),
          blockquote: ({ children }) => (
            <Box
              component="blockquote"
              sx={{
                borderLeft: `4px solid ${theme.palette.primary.main}`,
                pl: 2,
                py: 0.5,
                my: 1,
                backgroundColor:
                  theme.palette.mode === 'dark'
                    ? 'rgba(255,255,255,0.03)'
                    : 'rgba(0,0,0,0.02)',
                borderRadius: '4px',
              }}
            >
              {children}
            </Box>
          ),
          pre: ({ children }) => (
            <Box component="pre" sx={{ my: 1 }}>
              {children}
            </Box>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    );
  };

  // 用於保持訊息捲到最底
  const scrollToBottom = () => {
    if (chatBoxRef.current) {
      const scrollHeight = chatBoxRef.current.scrollHeight;
      const height = chatBoxRef.current.clientHeight;
      chatBoxRef.current.scrollTo({
        top: scrollHeight - height,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = async (e, restart = false) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    const prompt = input.trim();
    if (!prompt && !restart) return;

    // 使用者訊息
    if (!restart) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'user',
          text: prompt,
          timestamp: new Date().toISOString(),
        },
      ]);
      setInput('');
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload = restart ? { restart: true } : { prompt };

      const response = await fetch('http://127.0.0.1:5000/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? '登入已過期，請重新登入'
            : response.status === 403
            ? '無訪問權限'
            : `伺服器錯誤 (${response.status})`
        );
      }

      if (restart) {
        setMessages([
          {
            sender: 'system',
            text: '對話已重啟。新的對話已開始。',
            timestamp: new Date().toISOString(),
          },
        ]);
      } else {
        // 給一個「準備串流中」的假訊息 (bot)
        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: '',
            isStreaming: true,
            timestamp: new Date().toISOString(),
          },
        ]);
      }

      // 讀取 SSE
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let assistantReply = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.replace('data: ', ''));
              if (data.text) {
                assistantReply += data.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastIndex = updated.length - 1;
                  if (lastIndex >= 0 && updated[lastIndex].sender === 'bot') {
                    updated[lastIndex].text = assistantReply;
                    updated[lastIndex].isStreaming = true;
                  }
                  return updated;
                });
              }
              if (data.error) {
                throw new Error(data.error);
              }
            } catch (err) {
              console.error('串流解析錯誤:', err);
              throw new Error('回應格式錯誤或解析失敗');
            }
          }
        }
      }

      // 串流完成後，更新 isStreaming 狀態
      setMessages((prev) => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        if (lastIndex >= 0 && updated[lastIndex].sender === 'bot') {
          updated[lastIndex].isStreaming = false;
        }
        return updated;
      });
    } catch (error) {
      console.error('聊天錯誤:', error);
      setError(error.message);
      // 若發生錯誤，但剛才已加了一條空白 bot 訊息，就把它去掉
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.sender === 'bot' && !lastMsg.text) {
          return prev.slice(0, -1);
        }
        return [
          ...prev,
          {
            sender: 'system',
            text: `錯誤: ${error.message}`,
            timestamp: new Date().toISOString(),
            isError: true,
          },
        ];
      });
    } finally {
      setIsLoading(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleRestart = () => {
    if (messages.length > 1) {
      if (window.confirm('確定要重新開始對話嗎？當前對話將被清除。')) {
        handleSubmit(null, true);
      }
    } else {
      handleSubmit(null, true);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 範例提示
  const suggestions = [
    '你是誰啊？',
    '給我寫一個快速排序算法的 Python 實現',
    '你能做哪些事情?',
    '幫我寫一個簡單的 API 請求函數',
  ];

  return (
    <Box sx={styles.pageContainer}>
      {/* 中間主要可伸縮區域 */}
      <Box sx={styles.centerArea}>
        {/* 只有在沒訊息時才顯示一些建議提示；想要常駐也行 */}
        {messages.length === 0 && (
          <Box sx={styles.suggestionChips}>
            {suggestions.map((text, idx) => (
              <Button
                key={idx}
                variant="outlined"
                sx={{ textTransform: 'none' }}
                onClick={() => setInput(text)}
              >
                {text}
              </Button>
            ))}
          </Box>
        )}

        {/* 這裡是真正放「訊息列表」的區域 */}
        <Box sx={styles.chatContainer} ref={chatBoxRef}>
          <List sx={{ p: 0, m: 0 }}>
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={messageVariants}
                >
                  <ListItem disableGutters sx={{ flexDirection: 'column' }}>
                    {msg.sender === 'system' ? (
                      <Box sx={styles.systemMsgContainer}>
                        <Paper sx={styles.systemMsgBubble}>
                          {renderMessageContent(msg.text)}
                          <Typography sx={styles.messageTime}>
                            {formatTime(msg.timestamp)}
                          </Typography>
                        </Paper>
                      </Box>
                    ) : (
                      <Box
                        sx={
                          msg.sender === 'user'
                            ? styles.messageUser
                            : styles.messageBot
                        }
                      >
                        <Avatar
                          sx={
                            msg.sender === 'user'
                              ? styles.userAvatar
                              : styles.avatar
                          }
                        >
                          {msg.sender === 'user' ? 'U' : 'A'}
                        </Avatar>
                        <Paper
                          sx={
                            msg.sender === 'user'
                              ? styles.messageBubbleUser
                              : styles.messageBubbleBot
                          }
                        >
                          {renderMessageContent(msg.text)}
                          <Typography sx={styles.messageTime}>
                            {formatTime(msg.timestamp)}
                          </Typography>
                        </Paper>
                      </Box>
                    )}
                  </ListItem>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <ListItem>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2">AI 正在思考中...</Typography>
                </Box>
              </ListItem>
            )}
          </List>
        </Box>
      </Box>

      {/* 底部固定輸入區（不會被擠壓） */}
      <Box sx={styles.inputContainer}>
        <form style={styles.inputForm} onSubmit={handleSubmit}>
          <TextField
            inputRef={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="請輸入訊息..."
            multiline
            maxRows={4}
            fullWidth
            variant="outlined"
            sx={styles.textField}
          />
          <Tooltip title="重新開始對話">
            <IconButton
              onClick={handleRestart}
              disabled={isLoading}
              sx={styles.restartButton}
            >
              <RestartAltIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="發送訊息">
            <IconButton
              type="submit"
              disabled={isLoading}
              sx={{ ...styles.sendButton, backgroundColor: theme.palette.primary.main, color: '#fff' }}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </form>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={() => setSnackbarOpen(false)}
        message="複製成功！"
      />
    </Box>
  );
};

export default Chat;
