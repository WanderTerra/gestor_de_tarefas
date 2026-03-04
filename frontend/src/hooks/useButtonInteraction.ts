import { useRef, useCallback } from 'react';

interface UseButtonInteractionOptions {
  /** Duração da animação de ripple em ms */
  rippleDuration?: number;
  /** Cor do ripple (padrão: branco semi-transparente) */
  rippleColor?: string;
  /** Escala ao clicar (padrão: 0.95) */
  scaleOnClick?: number;
  /** Duração da animação de scale em ms */
  scaleDuration?: number;
}

interface ButtonInteractionHandlers {
  onMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseUp: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
}

/**
 * Hook para adicionar interações visuais aos botões (ripple effect, scale, feedback)
 * Segue as melhores práticas de UI/UX para feedback tátil e visual
 */
export function useButtonInteraction(
  originalOnClick?: (e: React.MouseEvent<HTMLButtonElement>) => void,
  options: UseButtonInteractionOptions = {}
): ButtonInteractionHandlers {
  const {
    rippleDuration = 600,
    rippleColor = 'rgba(255, 255, 255, 0.6)',
    scaleOnClick = 0.95,
    scaleDuration = 150,
  } = options;

  const isPressedRef = useRef(false);

  const createRipple = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    // Remove ripple anterior se existir
    const existingRipple = button.querySelector('.button-ripple');
    if (existingRipple) {
      existingRipple.remove();
    }

    // Cria novo ripple
    const ripple = document.createElement('span');
    ripple.className = 'button-ripple';
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      border-radius: 50%;
      background: ${rippleColor};
      transform: scale(0);
      animation: ripple-animation ${rippleDuration}ms ease-out;
      pointer-events: none;
      z-index: 1;
    `;

    // Garante que o botão tenha position relative
    const originalPosition = button.style.position;
    if (getComputedStyle(button).position === 'static') {
      button.style.position = 'relative';
      button.style.overflow = 'hidden';
    }

    button.appendChild(ripple);

    // Remove o ripple após a animação
    setTimeout(() => {
      ripple.remove();
      // Restaura position se não havia antes
      if (originalPosition === '') {
        button.style.position = '';
        button.style.overflow = '';
      }
    }, rippleDuration);
  }, [rippleColor, rippleDuration]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return; // Apenas botão esquerdo

    isPressedRef.current = true;
    const button = e.currentTarget;

    // Efeito de scale (compressão)
    button.style.transition = `transform ${scaleDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    button.style.transform = `scale(${scaleOnClick})`;

    // Cria ripple effect
    createRipple(e);
  }, [scaleOnClick, scaleDuration, createRipple]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isPressedRef.current) return;

    isPressedRef.current = false;
    const button = e.currentTarget;

    // Restaura scale
    button.style.transition = `transform ${scaleDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    button.style.transform = 'scale(1)';
  }, [scaleDuration]);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isPressedRef.current) return;

    isPressedRef.current = false;
    const button = e.currentTarget;

    // Restaura scale se o mouse sair enquanto pressionado
    button.style.transition = `transform ${scaleDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    button.style.transform = 'scale(1)';
  }, [scaleDuration]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (originalOnClick) {
      originalOnClick(e);
    }
  }, [originalOnClick]);

  return {
    onMouseDown: handleMouseDown,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseLeave,
    onClick: handleClick,
  };
}
