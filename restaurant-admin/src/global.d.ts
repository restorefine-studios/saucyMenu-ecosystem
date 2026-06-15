/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface ImportMetaEnv {
    readonly VITE_APP_LOCIZE_PROJECT_ID: string;
    readonly VITE_APP_LOCIZE_API_KEY: string;
    readonly VITE_APP_SERVER_URL: string;
    readonly VITE_APP_MEDIA_URL: string;
    // Add more env vars as needed
  }

  interface APIResponse<T> {
    success: boolean;
    data: T;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  export interface Setup {
    success: boolean;
    data: SetupData;
  }

  export interface SetupData {
    languages: Language[];
    currencies: Currency[];
  }

  type PaginationMeta = {
    totalItems: number; // converted from string
    limit: number;
    offset: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };

  export interface Chart {
    success: boolean;
    data: ChartData[];
  }

  export interface ChartData {
    count: number;
    month: string;
  }

  export interface AdminStats {
    success: boolean;
    data: AdminStatsData;
  }

  export interface AdminStatsData {
    totalUsers: number;
    totalDishes: number;
    totalAiCredits: number;
  }

  export interface Dish {
    success: boolean;
    data: DishData[];
    pagination: PaginationMeta;
  }

  export interface DishData {
    cookTime: number;
    spiceLevel: string;
    ingredients: string[];
    id: string;
    restaurantId: string;
    name: string;
    description: null | string;
    price: string;
    images: string[];
    createdAt: Date;
    tags: {
      id: string;
      name: string;
      type: string;
    }[];
    addOns: {
      id: string;
      name: string;
    }[];
    allergens: {
      id: string;
      name: string;
    }[];
    sectionId: string;
    isChefsRecommended: boolean;
    isPopular: boolean;
    isNew: boolean;
    isLimitedTime: boolean;
    isAlcoholic: boolean;
    isAvailable: boolean;
    discountType: string;
    discountValue: number;
    discountStartAt: Date;
    discountEndAt: Date;
    variants: {
      price: string;
      isAvailable: boolean;
      name: string;
    }[]
  }

  export interface OneDish {
    success: boolean;
    dish: OneDishData;
  }

  export interface OneDishData {
    id: string;
    name: string;
    description: string;
    price: number; // or number if you're using numeric values
    cookTime: string | null;
    createdAt: string;
    images: string[];
    ingredients: string | null;
    spiceLevel: string | null;
    restaurantId: string;
    tags: { [key: string]: any }[];
    tagIds: { [key: string]: any }[];
  }

  interface DrinkTag {
    id: string;
    name: string;
    type: string;
  }

  interface Drink {
    id: string;
    name: string;
    description: string;
    images: string[];
    isAlcoholic: boolean;
    isAvailable: boolean;
    createdAt: string;
    restaurantId: string;
    tags: DrinkTag[];
    variants: {
      price: string;
      quantity: string;
      unitName: string;
      unitSymbol: string;
      available: boolean
    }[]
  }

  interface Drinks {
    success: boolean;
    data: Drink[];
    pagination: Pagination;
  }

  // fetch specific drink type
  export interface OneDrinkResponse {
    data: OneDrinkData;
    success: boolean;
  }

  export interface OneDrinkData {
    id: string;
    name: string;
    description: string;
    images: string[];
    isAlcoholic: boolean;
    isAvailable: boolean;
    restaurantId: string;
    createdAt: string;
    tags: any[];
    tagIds: any[];
    variants: any[];
  }

  export interface MenuClass {
    success: boolean;
    data: {
      id: string;
      name: string;
      type: string;
    }[];
  }

  export interface MenuClassItem {
    id: string;
    name: string;
  }

  export interface Currency {
    id: string;
    code: string;
    name: string;
    symbol: string;
  }
  export interface Language {
    id: string;
    code: string;
    name: string;
  }

  export interface LoginData {
    name: string;
    email: string;
    role: string;
    languageId: string | undefined;
    restaurantId: string;
    restaurant: Restaurant;
    token: string;
  }
  export interface Restaurant {
    name: string;
    currencies: Currencies;
  }

  export interface Currencies {
    code: string;
    name: string;
    symbol: string;
  }

  export interface IngredientsResponse {
    success: boolean;
    data: IngredientsData[];
  }

  export interface IngredientsData {
    id: string;
    name: string;
  }
  export interface SubscriptionList {
    success: boolean;
    data: SubscriptionListData[];
  }

  export interface SubscriptionListData {
    id: string;
    stripeProductId: string;
    name: string;
    stripePriceId: string;
    createdAt: Date;
    subscribed: boolean;
    status?: string;
    currentPeriodEnd?: string;
    cancelAtPeriodEnd?: boolean;
  }

  export interface DrinkUnits {
    success: boolean;
    data: DrinkUnitsData[];
  }

  export interface DrinkUnitsData {
    id: string;
    name: string;
    symbol: string;
  }

  export type TagType =
    | "cuisine"
    | "dish_type"
    | "diet"
    | "allergen"
    | "drink_type";

  export interface Tag {
    id: string;
    name: string;
    type: TagType;
    description: string;
  }

  export interface TagResponse {
    success: boolean;
    data: Tag[];
  }



  interface ReviewsResponse {
    success: boolean;
    data: ReviewData[];
    pagination: Pagination;
  }
  export interface ReviewData {
    review: Review;
    menuItem: ReviewDishDrink;
  }
  export interface ReviewDishDrink {
    name: string;
    id: string;
  }

  export interface Review {
    id: string;
    reviewableId: string;
    reviewableType: string;
    rating: number;
    comment: string;
    restaurantId: string;
    createdAt: Date;
  }
  export interface DishTypeChartResponse {
    success: boolean;
    data: {
      tagName: string;
      count: string;
    }[];
  }

  export interface ProfileResponse {
    success: boolean;
    data: ProfileResponseData;
  }

  export interface ProfileResponseData {
    email: string;
    name: string;
    role: string;
    languageId: string;
    restaurant: ProfileRestaurant;
  }

  export interface ProfileRestaurant {
    id: string;
    address: string;
    name: string;
    currencyId: string;
    image: string;
    description: string;
  }

}

export { };
