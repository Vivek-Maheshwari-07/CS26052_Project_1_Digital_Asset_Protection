import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useVoiceTrigger: Browser-native Web Speech API hook
 * Provides zero-VRAM, 0ms latency STT and continuous wake-word listening for "Hey Mark".
 * Also provides natural SpeechSynthesis TTS for Mark's voice replies.
 */
export function useVoiceTrigger({ onVoiceCommand, isMuted = false }) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [wakeWordDetected, setWakeWordDetected] = useState(false);

  const recognitionRef = useRef(null);
  const isContinuousRef = useRef(true);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('[Mark Voice] Web Speech API not supported in this browser.');
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        // Auto restart for continuous background wake-word listening if enabled
        if (isContinuousRef.current) {
          try {
            recognition.start();
          } catch {
            // Already started or busy
          }
        } else {
          setIsListening(false);
        }
      };

      recognition.onerror = (event) => {
        if (event.error !== 'no-speech') {
          console.warn('[Mark Voice] Recognition error:', event.error);
        }
      };

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          currentTranscript += item[0].transcript;

          if (item.isFinal) {
            const rawText = item[0].transcript.trim();
            const lower = rawText.toLowerCase();

            // Wake word detector: "Hey Mark" or "Mark"
            if (lower.includes('hey mark') || lower.startsWith('mark')) {
              setWakeWordDetected(true);
              const command = rawText
                .replace(/hey mark/i, '')
                .replace(/^mark/i, '')
                .trim();

              if (command.length > 1 && onVoiceCommand) {
                onVoiceCommand(command);
              }

              setTimeout(() => setWakeWordDetected(false), 2500);
            }
          }
        }
        setTranscript(currentTranscript);
      };

      recognitionRef.current = recognition;

      // Start listening by default
      try {
        recognition.start();
      } catch (err) {
        console.warn('[Mark Voice] Initial mic start skipped (needs user click):', err);
      }
    } catch (err) {
      console.warn('[Mark Voice] Initialization error:', err);
      setIsSupported(false);
    }

    return () => {
      isContinuousRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [onVoiceCommand]);

  // Speech Synthesis (TTS)
  const speak = useCallback(
    (text) => {
      if (!window.speechSynthesis || isMuted || !text) return;

      try {
        window.speechSynthesis.cancel(); // Cancel any existing speech

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;

        // Pick a natural English voice if available
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') ||
              v.name.includes('Google') ||
              v.name.includes('David') ||
              v.name.includes('Samantha'))
        );
        if (preferred) utterance.voice = preferred;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('[Mark Voice] Speech synthesis error:', err);
        setIsSpeaking(false);
      }
    },
    [isMuted]
  );

  const stopSpeaking = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const toggleMic = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) {
      isContinuousRef.current = false;
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    } else {
      isContinuousRef.current = true;
      try {
        recognitionRef.current.start();
      } catch {}
      setIsListening(true);
    }
  }, [isListening]);

  return {
    isListening,
    isSpeaking,
    transcript,
    isSupported,
    wakeWordDetected,
    speak,
    stopSpeaking,
    toggleMic,
  };
}
