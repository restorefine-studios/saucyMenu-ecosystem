import { axiosInstance } from "@/lib/utils";

class MediaService {
  public uploadImage = async (formData: FormData) => {
    return await axiosInstance.post("/admin/upload", formData);
  };

  public deleteMedia = async (key: string) => {
    return await axiosInstance.delete(`/admin/upload/${key}`);
  };
}

const MediaServices = new MediaService();
export default MediaServices;
