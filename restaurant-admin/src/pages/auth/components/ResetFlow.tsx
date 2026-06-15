// File: /components/authentication/password-reset/ResetFlow.tsx
import { useState } from "react";
import ResetStep1 from "../reset";
import ResetStep3 from "../reset-password";

const ResetFlow = () => {
  const [resetStep, setResetStep] = useState(1);

  const handleBack = () => {
    setResetStep((prev) => Math.max(prev - 1, 1));
  };

  const handleNext = () => {
    setResetStep((prev) => Math.min(prev + 1, 3));
  };

  const handleComplete = () => {
    // Here you would handle the final submission
    // For now, we'll just reset back to step 1
    setResetStep(1);
    alert("Password reset successfully!");
  };

  return (
    <div className="mt-8 max-w-md mx-auto w-full">
      {/* Reset step content */}
      {resetStep === 1 && <ResetStep1 onNext={handleNext} />}
      {/* {resetStep === 2 && (
        <ResetStep2 onNext={handleNext} onBack={handleBack} />
      )} */}
      {resetStep === 2 && (
        <ResetStep3 onComplete={handleComplete} onBack={handleBack} />
      )}
    </div>
  );
};

export default ResetFlow;
