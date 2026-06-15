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
  <div>
    <label
      htmlFor="email"
      className="block font-inter text-[16px] font-regular"
    >
      Enter Code
    </label>
    <div className="relative">
      <InputOTP id="otp" maxLength={6} value={value} onChange={onChange}>
        <InputOTPGroup>
          {[...Array(6)].map((_, i) => (
            <InputOTPSlot key={i} index={i} />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>
  </div>
);

export default OtpInputBlock;
