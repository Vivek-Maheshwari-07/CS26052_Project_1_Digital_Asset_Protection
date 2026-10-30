/**
 * Mark ALM Action Dispatcher
 * Translates deterministic LLM JSON actions into client-side UI executions.
 */

export const executeMarkAction = async ({
  action,
  target,
  tech,
  navigate,
  setSpotlight,
}) => {
  if (!action || action === 'NONE') return;

  console.log(`[Mark ALM Dispatcher] Executing action: ${action}`, { target, tech });

  switch (action) {
    case 'NAVIGATE': {
      if (target && typeof navigate === 'function') {
        navigate(target);
      }
      break;
    }

    case 'OPEN_SIMULATOR': {
      if (typeof navigate === 'function') {
        navigate('/how-it-works');
      }
      break;
    }

    case 'EXPLODE_PIXELS': {
      if (typeof navigate === 'function') {
        navigate('/how-it-works');
      }
      // Small timeout to allow page route transition if not already on /how-it-works
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('mark:explode-pixels'));
      }, 350);
      break;
    }

    case 'EXPLAIN_TECH': {
      if (typeof navigate === 'function') {
        navigate('/how-it-works');
      }
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('mark:explain-tech', { detail: { tech: tech || 'phash' } })
        );
      }, 350);
      break;
    }

    case 'FOCUS_REGISTER': {
      if (typeof navigate === 'function') {
        navigate('/works/new');
      }
      // Wait for React to render /works/new
      setTimeout(() => {
        const dropzone =
          document.querySelector('.dropzone') ||
          document.querySelector('input[type="file"]')?.parentElement ||
          document.querySelector('.card');

        if (dropzone && typeof setSpotlight === 'function') {
          const rect = dropzone.getBoundingClientRect();
          setSpotlight({
            top: rect.top + window.scrollY - 8,
            left: rect.left + window.scrollX - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            message: 'Drop your original artwork here to mint your provenance proof!',
          });
          dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
      break;
    }

    case 'START_TUTORIAL': {
      runGuidedTutorial({ target, navigate, setSpotlight });
      break;
    }

    default:
      console.warn(`[Mark ALM Dispatcher] Unhandled action: ${action}`);
      break;
  }
};

/**
 * Multi-step Interactive Spotlight Tutorial
 */
const runGuidedTutorial = ({ target, navigate, setSpotlight }) => {
  if (typeof navigate === 'function') {
    navigate('/works/new');
  }

  setTimeout(() => {
    const steps = [
      {
        selector: '.dropzone, input[type="file"]',
        message: 'Step 1: Upload your master image here (supports PNG, JPG, WebP).',
      },
      {
        selector: 'input[name="title"], input[placeholder*="Title"]',
        message: 'Step 2: Enter your artwork title and author metadata.',
      },
      {
        selector: 'button[type="submit"], .btn-primary',
        message: 'Step 3: Click here to calculate pHash, generate SIFT vectors & anchor on Bitcoin!',
      },
    ];

    let currentStep = 0;

    const highlightNext = () => {
      if (currentStep >= steps.length) {
        if (typeof setSpotlight === 'function') setSpotlight(null);
        return;
      }

      const item = steps[currentStep];
      const el = document.querySelector(item.selector);

      if (el && typeof setSpotlight === 'function') {
        const rect = el.getBoundingClientRect();
        setSpotlight({
          top: rect.top + window.scrollY - 6,
          left: rect.left + window.scrollX - 6,
          width: rect.width + 12,
          height: rect.height + 12,
          message: item.message,
          onNext: () => {
            currentStep += 1;
            highlightNext();
          },
        });
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        currentStep += 1;
        highlightNext();
      }
    };

    highlightNext();
  }, 500);
};
