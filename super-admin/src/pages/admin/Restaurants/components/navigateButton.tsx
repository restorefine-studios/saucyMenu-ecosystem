import { useNavigate } from "react-router-dom";

const NavigateButton = ({ id }: { id: string }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/admin/restaurants/${id}`);
  };

  return (
    <p
      onClick={handleClick}
      className="text-black hover:cursor-pointer hover:underline"
    >
      View
    </p>
  );
};

export default NavigateButton;
