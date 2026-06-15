import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Color {
  hex: string;
}

interface ColorSelectorProps {
  value?: Color[];
  onChange?: (colors: Color[]) => void;
}

export default function ColorSelector({ value, onChange }: ColorSelectorProps) {
  const [colors, setColors] = useState<Color[]>(
    value || [{ hex: "#FC4949" }, { hex: "#FCC949" }]
  );

  const [isPickerOpen, setIsPickerOpen] = useState(true);
  const [newColor, setNewColor] = useState("#000000");
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value && JSON.stringify(value) !== JSON.stringify(colors)) {
      setColors(value);
    }
  }, [value]);

  const updateColors = (newColors: Color[]) => {
    setColors(newColors);
    if (onChange) {
      onChange(newColors);
    }
  };

  const addColor = () => {
    // const newId = Math.max(0, ...colors.map((c) => c.id)) + 1
    const updatedColors = [...colors, { hex: newColor }];
    updateColors(updatedColors);
    setIsPickerOpen(false);
  };

  const removeColor = (hex: string) => {
    const updatedColors = colors.filter((color) => color.hex !== hex);
    updateColors(updatedColors);
  };

  return (
    <div className="">
      <h1 className="font-inter text-sm text-gray-600 font-medium">
        Update Colors
      </h1>
      <div className="bg-gray-100 px-4 py-7  rounded-2xl overflow-y-auto">
        <div className="flex items-center gap-2">
          {colors.map((color) => (
            <div
              key={color.hex}
              className="flex items-center bg-white rounded-full py-2 px-4 shadow-sm"
            >
              <div
                className="w-4 h-4 rounded-full mr-2"
                style={{ backgroundColor: color.hex }}
              />
              <span className="text-sm">{color.hex}</span>
              <button
                onClick={() => removeColor(color.hex)}
                className="ml-2 hover:cursor-pointer hover:text-red-500 "
              >
                <X size={15} color="red" />
              </button>
            </div>
          ))}
          <Button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            className="w-7 h-7 rounded-full bg-white hover:bg-white hover:cursor-pointer flex items-center justify-center shadow-sm"
          >
            <Plus size={15} color="black" />
          </Button>
          {isPickerOpen && (
            <div
              ref={pickerRef}
              className="absolute top-25 left-0 bg-white p-4 rounded-lg z-10 w-64"
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">Add a color</h3>
                <Button
                  type="button"
                  onClick={() => setIsPickerOpen(false)}
                  className="text-gray-500 bg-white hover:bg-white hover:cursor-pointer hover:text-gray-700"
                >
                  <X size={18} />
                </Button>
              </div>
              <div className="mb-3">
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="w-full h-10 cursor-pointer rounded border border-gray-200"
                />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-8 h-8 rounded-full"
                  style={{ backgroundColor: newColor }}
                />
                <input
                  type="text"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm"
                />
              </div>
              <Button
                onClick={addColor}
                className="w-full bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Add Color
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
