import axios, { AxiosRequestConfig, Method } from "axios";

type RequestParamsType = {
  url: string;
  method: Method | undefined;
  data?: object | undefined;
  token?: string | null | undefined;
  params?: object | undefined;
  contentType?: string | undefined;
};

class MediaService {
  private env!: boolean;
  private ENDPOINT: string;

  constructor() {
    this.env = import.meta.env.DEV;
    this.ENDPOINT = this.env
      ? "https://media-service.fly.dev"
      : "https://upload.saucymenu.com";
  }

  private request = async ({
    method,
    url,
    data,
    token,
    params,
    contentType = "application/json",
  }: RequestParamsType) => {
    const config: AxiosRequestConfig = {
      method,
      baseURL: this.ENDPOINT,
      url,
      data,
      params,
    };
    config.headers = {
      "Content-Type": contentType,
    };

    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    return await axios(config);
  };

  public uploadImage = async (formData: FormData) => {
    return await this.request({
      method: "POST",
      url: "/upload",
      data: formData,
      contentType: "multipart/form-data",
    });
  };

  /**
   * name: deleteMedia
   * */
  public deleteMedia = async (key: string) => {
    return await this.request({
      method: "delete",
      url: `/delete-image/${key}`,
      // data: { file: image },
    });
  };
}

const MediaServices = new MediaService();
export default MediaServices;
