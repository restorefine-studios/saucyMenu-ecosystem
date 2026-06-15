import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

interface OtpInputBlockProps {
  value: string;
  onChange: (val: string) => void;
}

const OtpInputBlock = ({ value, onChange }: OtpInputBlockProps) => (
  <div className="space-y-2">
    <label
      htmlFor="otp"
      className="block text-sm text-gray-600 font-medium"
    >
      Enter Code
    </label>
    <InputOTP id="otp" maxLength={6} value={value} onChange={onChange}>
      <InputOTPGroup className="gap-2">
        {[...Array(6)].map((_, i) => (
          <InputOTPSlot
            key={i}
            index={i}
            className="h-12 w-12 rounded-xl border border-gray-200 bg-gray-100 text-center text-base font-semibold"
          />
        ))}
      </InputOTPGroup>
    </InputOTP>
  </div>
);

export default OtpInputBlock;
