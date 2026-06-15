declare global {
  export interface ApiResponse<T> {
    success: boolean
    data: T
  }
  export interface Paginator {
    totalItems: string
    limit: number
    offset: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
  export interface LoginData {
    sessionId: string
    token: string
    currency: Currency
  }
  export interface Currency {
    code: string
    name: string
    symbol: string
  }
  export interface SetupResponse {
    success: boolean
    data: Data
  }

  export interface Data {
    languages: SetupItems[]
    currencies: SetupItems[]
  }

  export interface SetupItems {
    id: string
    code: string
    name: string
    symbol?: string
    flag?: string
  }

  export interface PreferenceResponse {
    success: boolean
    data: PreferenceItems[]
  }

  export interface PreferenceItems {
    id: string
    name: string
  }

  export interface DishResponse {
    success: boolean
    data: DishItem[]
    pagination: Paginator
  }

  export interface DishItem {
    id: string
    name: string
    price: string
    cookTime: number
    images: string
    description: null | string
    dishIngredients: DietClass[]
    cuisines: DietClass[]
    diets: DietClass[]
    dishTypes: DietClass[]
  }
  export interface DishViewItem {
    id: string
    name: string
    price: string
    cookTime: number
    averageRating: number
    images: string[]
    description: null | string
    ingredients: string[]
    spiceLevel: string
    tags: {
      name: string
      type: string

    }[]
    addOns: {
      name: string
      price: string
      id: string
    }[]
    variants: {
      id: string
      name: string
      price: string
      isAvailable: boolean
    }[]
  }

  export interface CuisineElement {
    cuisine: DietClass
  }

  export interface DietClass {
    name: string
  }

  export interface Diet {
    diet: DietClass
  }

  export interface DishIngredient {
    ingredient: DietClass
  }

  export interface DishType {
    dishType: DietClass
  }

  export interface DishTypeResponse {
    success: boolean
    data: DishTypeItem[]
  }

  export interface DishTypeItem {
    id: string
    name: string
    description: string
  }
  export interface DrinkTag {
    id: string
    name: string
  }

  export interface DrinkVariant {
    id: string
    quantity: string
    unitName: string
    unitSymbol: string
    unitId: string
    price: string
    available: boolean
  }

  export interface Drink {
    id: string
    name: string
    description: string | null
    images: string[]
    isAvailable: boolean
    isAlcoholic: boolean
    tags: DrinkTag[]
    variants: DrinkVariant[]
  }

  export interface DrinkListResponse {
    success: boolean
    data: Drink[]
    pagination: Paginator
  }

  export interface RestaurantResponse {
    success: boolean
    data: RestaurantResponseData
    restaurantdetails?: RestaurantResponseData
  }

  export interface RestaurantResponseData {
    id: string
    name: string
    description: string
    image: string
    bannerUrl: string
  }

  export interface RestaurantMenus {
    success: boolean
    data: RestaurantMenusData[]
    menus?: RestaurantMenusData
  }

  export interface MenuSection {
    data: MenuSectionResponse[]
    success: boolean
    menuTitle: string
    menuDescription: string
  }

  export interface MenuSectionResponse {
    id: string
    name: string
    menu: { name: string }
    menuId: string
    description: string
    sortOrder: number
    translationStatus: string
    createdAt: string
    translations: Record<string, any>
  }

  export interface RestaurantMenusData {
    id: string
    name: string
    description: string
    image: string
    active: boolean
  }

  export interface ClassifiedMenuItems {
    chefsRecommended: MenuItemResponse[]
    popular: MenuItemResponse[]
    new: MenuItemResponse[]
    limitedTime: MenuItemResponse[]
  }

  export interface MenuItemResponse {
    id: string
    sectionId: string
    restaurantID: string
    type: string
    name: string
    description: string
    translationStatus: string
    images: string[]
    price: string
    discountType: null
    discountValue: null
    discountStartAt: null
    discountEndAt: null
    discountLabel: null
    isAvailable: boolean
    spiceLevel: null
    cookTime: number
    isAlcoholic: null
    hasVariants: boolean
    isChefsRecommended: boolean
    isPopular: boolean
    isNew: boolean
    isLimitedTime: boolean
    createdAt: Date
  }
}
export { }
