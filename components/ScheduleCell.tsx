import React, { useRef } from 'react';

interface ScheduleCellProps {
  displayStatus: string;
  displayClass: string;
  onCycle: () => void;
  onReset: () => void;
}

const ScheduleCell: React.FC<ScheduleCellProps> = ({
  displayStatus,
  displayClass,
  onCycle,
  onReset
}) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  // Inicia o timer quando o usuário pressiona
  const startPress = () => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      // Vibração tátil se o dispositivo suportar (mobile)
      if (navigator.vibrate) navigator.vibrate(50);
      onReset();
    }, 500); // 500ms para considerar "segurar"
  };

  // Finaliza o pressionamento
  const endPress = (e?: React.MouseEvent | React.TouchEvent) => {
    // Limpa o timer se soltar antes
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Se não foi um clique longo, executa a ação de ciclo normal
    if (!isLongPress.current) {
      onCycle();
    }
  };

  // Cancela se o mouse sair ou se mover o dedo (scroll)
  const cancelPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <td
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseLeave={cancelPress}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      onTouchMove={cancelPress}
      onContextMenu={(e) => e.preventDefault()} // Previne menu de contexto ao segurar
      className={`border-b border-l border-slate-700/50 p-1 text-center cursor-pointer transition-all hover:brightness-110 active:scale-95 select-none text-[11px] font-bold ${displayClass}`}
      title="Clique para alternar, Segure para limpar"
    >
      {displayStatus || '-'}
    </td>
  );
};

export default ScheduleCell;