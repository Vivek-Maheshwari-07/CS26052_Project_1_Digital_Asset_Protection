import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Clean leading/trailing punctuation and whitespace left after wake-word extraction.
 */
function cleanCommand(text) {
  if (!text) return '';
  return text
    .replace(/^[\s,.;:!?\-—'"]+/, '')
    .replace(/[\s,.;:!?\-—'"]+$/, '')
    .trim();
}

/**
 * Play a futuristic subtle chime on wake-word detection (Siri/Alexa style)
 */
function playWakeChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Gentle upbeat two-tone chime: D5 (587Hz) to A5 (880Hz)
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch {
    // AudioContext blocked until user interaction
  }
}

const WAKE_WORD_REGEX = /\b(hey\s+mark|hi\s+mark|ok\s+mark|hey\s+marc|hi\s+marc|hello\s+mark|mark|marc)\b/i;

/**
 * useVoiceTrigger: Browser-native Web Speech API hook
 * Provides instant wake-word listening for "Hey Mark", responsive interim feedback,
 * clean punctuation stripping, and natural speech synthesis.
 */
export function useVoiceTrigger({ onVoiceCommand, onWake, isMuted = false, isOpen = false }) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [wakeWordDetected, setWakeWordDetected] = useState(false);

  const recognitionRef = useRef(null);
  const isContinuousRef = useRef(true);
  const inWakeModeRef = useRef(false);
  const onVoiceCommandRef = useRef(onVoiceCommand);
  const onWakeRef = useRef(onWake);

  useEffect(() => {
    onVoiceCommandRef.current = onVoiceCommand;
    onWakeRef.current = onWake;
  }, [onVoiceCommand, onWake]);

  // If drawer is opened by the user, treat as actively listening for commands
  useEffect(() => {
    if (isOpen) {
      inWakeModeRef.current = true;
    }
  }, [isOpen]);

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
        // Auto-restart for continuous background wake-word listening
        if (isContinuousRef.current) {
          try {
            recognition.start();
          } catch {
            // Already active or waiting
          }
        } else {
          setIsListening(false);
        }
      };

      recognition.onerror = (event) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('[Mark Voice] Recognition error:', event.error);
        }
      };

      recognition.onresult = (event) => {
        let currentTranscript = '';
        let finalPhrase = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          currentTranscript += item[0].transcript;

          if (item.isFinal) {
            finalPhrase = item[0].transcript.trim();
          }
        }

        setTranscript(currentTranscript);

        // Process final speech output
        if (finalPhrase) {
          const lower = finalPhrase.toLowerCase();
          const hasWakeWord = WAKE_WORD_REGEX.test(lower);

          if (hasWakeWord) {
            playWakeChime();
            setWakeWordDetected(true);
            inWakeModeRef.current = true;

            // Extract the command after the wake-word
            const rawRemainder = finalPhrase.replace(WAKE_WORD_REGEX, '');
            const command = cleanCommand(rawRemainder);

            if (onWakeRef.current) {
              onWakeRef.current();
            }

            if (command.length >= 2) {
              if (onVoiceCommandRef.current) {
                onVoiceCommandRef.current(command);
              }
            } else {
              // User said JUST "Hey Mark"
              if (onVoiceCommandRef.current) {
                onVoiceCommandRef.current('hey mark');
              }
            }

            setTimeout(() => setWakeWordDetected(false), 2000);
          } else if (inWakeModeRef.current) {
            // Active conversation mode: user is speaking directly while drawer is active
            const command = cleanCommand(finalPhrase);
            if (command.length >= 2 && onVoiceCommandRef.current) {
              onVoiceCommandRef.current(command);
            }
          }
        }
      };

      recognitionRef.current = recognition;

      try {
        recognition.start();
      } catch (err) {
        console.warn('[Mark Voice] Initial mic start needs user interaction:', err);
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
  }, []);

  // Speech Synthesis (TTS)
  const speak = useCallback(
    (text) => {
      if (!window.speechSynthesis || isMuted || !text) return;

      try {
        window.speechSynthesis.cancel();

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
              v.name.includes('Samantha') ||
              v.name.includes('Guy'))
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
      inWakeModeRef.current = false;
    } else {
      isContinuousRef.current = true;
      inWakeModeRef.current = true;
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
