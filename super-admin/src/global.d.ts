declare global {
  export interface LoginData {
    id: string;
    email: string;
    name: string;
    token: string;
  }

  export interface Setup {
    success: boolean;
    data: SetupData;
  }

  export interface SetupData {
    languages: Language[];
    currencies: Currency[];
  }

  export interface Subs {
    success: boolean;
    data: SubsData[];
    plans: Plan[];
    pagination: Pagination;
  }

  export interface Plan {
    name: string;
  }

  export interface SubsData {
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    planName: string;
    restaurantName: string;
    status: string;
    stripeSubscriptionId: string;
    userName: string;
  }
  type Restaurant = {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    website: string | null;
    image: string | null;
    description: string | null;
    color: string | null;
    createdAt: string;
    currencyId: string;
    status: "PENDING" | "COMPLETED";
    email: string | null;
  };

  type Pagination = {
    totalItems: string;
    limit: number;
    offset: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };

  type RestaurantResponse = {
    success: boolean;
    data: Restaurant[];
    pagination: Pagination;
  };
  interface CountData {
    count: string;
  }

  interface DashboardData {
    totalRestaurants: string;
    totalSessions: string;
    totalCreditsUsed: string;
    creditsThisMonth: string,
    restaurantsThisMonth: string,
    sessionsThisMonth: string
  }

  interface DashboardResponse {
    success: boolean;
    data: DashboardData;
  }

}
export { };
