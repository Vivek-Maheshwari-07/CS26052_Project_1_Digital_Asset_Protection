import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useVoiceTrigger } from './useVoiceTrigger';
import { executeMarkAction } from './markActions';
import './mark.css';

export default function MarkOrb() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [inputText, setInputText] = useState('');
  const [spotlight, setSpotlight] = useState(null);

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Hey! I'm Mark, your AI Provenance Copilot running on local Qwen 2.5. Say 'Hey Mark' or ask me to register works, explain computer vision math, or explode pixels in 3D!",
      action: 'NONE',
    },
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Handle User Message (via voice or text input)
  const handleSendMessage = useCallback(
    async (text) => {
      const trimmed = text?.trim();
      if (!trimmed || isThinking) return;

      // Add user message to conversation
      setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
      setInputText('');
      setIsThinking(true);
      setIsOpen(true); // Automatically open drawer if voice activated

      try {
        const resp = await fetch('/api/mark/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            current_path: location.pathname,
          }),
        });

        if (!resp.ok) {
          throw new Error(`Server returned ${resp.status}`);
        }

        const data = await resp.json();
        const replyText = data.reply || "I've processed your request.";

        // Add assistant message
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: replyText,
            action: data.action,
            target: data.target,
            tech: data.tech,
          },
        ]);

        // Speak the reply aloud if not muted
        speak(replyText);

        // Execute deterministic UI action
        executeMarkAction({
          action: data.action,
          target: data.target,
          tech: data.tech,
          navigate,
          setSpotlight,
        });
      } catch (err) {
        console.error('[Mark Copilot] Request error:', err);
        const errorReply =
          "I'm currently unable to reach the local model, but you can explore the 3D twin or register your artwork directly.";
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: errorReply,
            action: 'NONE',
          },
        ]);
        speak(errorReply);
      } finally {
        setIsThinking(false);
      }
    },
    [isThinking, location.pathname, navigate]
  );

  // Wire Voice Hook
  const {
    isListening,
    isSpeaking,
    transcript,
    wakeWordDetected,
    speak,
    stopSpeaking,
    toggleMic,
  } = useVoiceTrigger({
    onVoiceCommand: handleSendMessage,
    isMuted,
  });

  const handleMuteToggle = () => {
    if (!isMuted) {
      stopSpeaking();
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };

  const orbStateClass = isThinking
    ? 'is-thinking'
    : isSpeaking
    ? 'is-speaking'
    : isListening || wakeWordDetected
    ? 'is-listening'
    : '';

  return (
    <>
      {/* Interactive Spotlight Beam (Tutorial & Dropzone Highlight) */}
      {spotlight && (
        <div
          className="mark-spotlight-beam"
          style={{
            top: `${spotlight.top}px`,
            left: `${spotlight.left}px`,
            width: `${spotlight.width}px`,
            height: `${spotlight.height}px`,
          }}
        >
          <div className="mark-spotlight-tooltip">
            <span>✨ {spotlight.message}</span>
            {spotlight.onNext && (
              <button onClick={spotlight.onNext}>Next Step ➔</button>
            )}
            <button onClick={() => setSpotlight(null)}>Got it</button>
          </div>
        </div>
      )}

      {/* Floating Mark Widget Container */}
      <div className="mark-widget-container">
        {/* Open Drawer */}
        {isOpen && (
          <aside className="mark-drawer" aria-label="Mark AI Copilot">
            {/* Header */}
            <div className="mark-drawer-header">
              <div className="mark-copilot-identity">
                <div className="mark-mini-avatar">M</div>
                <div className="mark-identity-text">
                  <h4>
                    Mark <span className="mark-model-tag">Qwen 2.5 1.5B Local</span>
                  </h4>
                  <div className="mark-status-line">
                    {isThinking
                      ? 'Thinking on GPU...'
                      : isSpeaking
                      ? 'Speaking...'
                      : isListening
                      ? "Listening for 'Hey Mark'..."
                      : 'Active • Provenance Copilot'}
                  </div>
                </div>
              </div>

              <div className="mark-header-controls">
                <button
                  className="mark-icon-btn"
                  onClick={handleMuteToggle}
                  title={isMuted ? 'Unmute voice replies' : 'Mute voice replies'}
                  aria-label="Toggle mute"
                >
                  {isMuted ? '🔇' : '🔊'}
                </button>
                <button
                  className="mark-icon-btn"
                  onClick={() => {
                    setIsOpen(false);
                    stopSpeaking();
                  }}
                  title="Minimize Mark"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Visualizer Wave when speaking or listening */}
            {(isSpeaking || isListening) && (
              <div className="mark-audio-bar">
                <span className="wave-line" />
                <span className="wave-line" />
                <span className="wave-line" />
                <span className="wave-line" />
                <span className="wave-line" />
              </div>
            )}

            {/* Conversation Log */}
            <div className="mark-chat-scroll">
              {messages.map((m, idx) => (
                <div key={idx} className={`mark-msg ${m.role}`}>
                  <div className="mark-bubble">{m.content}</div>
                  {m.action && m.action !== 'NONE' && (
                    <div className="mark-action-badge">
                      ⚡ Action: {m.action.replace('_', ' ')}
                    </div>
                  )}
                </div>
              ))}
              {isThinking && (
                <div className="mark-msg assistant">
                  <div className="mark-bubble" style={{ opacity: 0.8 }}>
                    <em>Thinking...</em>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Chips */}
            <div className="mark-suggestions">
              <button
                className="mark-chip"
                onClick={() => handleSendMessage('Please explode pixels in 3D')}
              >
                💥 Explode pixels in 3D
              </button>
              <button
                className="mark-chip"
                onClick={() => handleSendMessage('How do I register a new artwork?')}
              >
                🛡️ Register my artwork
              </button>
              <button
                className="mark-chip"
                onClick={() => handleSendMessage('Scan an image for copyright theft')}
              >
                🔍 Check an image
              </button>
              <button
                className="mark-chip"
                onClick={() => handleSendMessage('Explain how pHash and SIFT work')}
              >
                📐 Explain pHash vs SIFT
              </button>
              <button
                className="mark-chip"
                onClick={() => handleSendMessage('Start onboarding tutorial')}
              >
                🧭 Guided Tour
              </button>
            </div>

            {/* Input Bar */}
            <form
              className="mark-input-bar"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputText);
              }}
            >
              <input
                type="text"
                className="mark-input-field"
                placeholder={transcript ? `"${transcript}"` : "Ask Mark or say 'Hey Mark'..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <button
                type="button"
                className={`mark-mic-btn ${isListening ? 'active' : ''}`}
                onClick={toggleMic}
                title={isListening ? 'Microphone active' : 'Click to speak'}
              >
                🎙️
              </button>
              <button type="submit" className="mark-send-btn" title="Send message">
                ➔
              </button>
            </form>
          </aside>
        )}

        {/* Floating 3D Glowing Orb Button */}
        <button
          className={`mark-orb-trigger ${orbStateClass}`}
          onClick={() => setIsOpen((prev) => !prev)}
          title="Mark - AI Provenance Copilot (Say 'Hey Mark')"
          aria-label="Toggle Mark AI Copilot"
        >
          {/* Wake Word Badge */}
          <div className="mark-wake-pill">
            <span className="pill-dot" />
            <span>Hey Mark</span>
          </div>

          {/* Spherical Glowing Layers */}
          <div className="mark-orb-ring" />
          <div className="mark-orb-ring-secondary" />
          <div className="mark-orb-core" />

          {/* Central Logo / Pulse Wave Icon */}
          <div className="mark-orb-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </div>
        </button>
      </div>
    </>
  );
}
