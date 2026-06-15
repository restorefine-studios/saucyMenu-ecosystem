interface TimerDisplayProps {
  secondsLeft: number;
}

const TimerDisplay = ({ secondsLeft }: TimerDisplayProps) => {
  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, "0")}:${sec
      .toString()
      .padStart(2, "0")}`;
  };

  return <span className="font-regular">{formatTime(secondsLeft)}</span>;
};

export default TimerDisplay;
