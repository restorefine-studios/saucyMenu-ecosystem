type SpinnerProps = {
  classname?: string;
};

function Spinner({ classname }: SpinnerProps) {
  return (
    <div className={` ${ classname } h-full flex flex-col items-center justify-center gap-4 p-6`}>
      <div className="w-6 h-6 border-3 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

export default Spinner;
