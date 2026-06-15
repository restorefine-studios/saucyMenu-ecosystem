export interface Classifications {
    success: boolean;
    data: ClassificationsData;
}

export interface ClassificationsData {
    dishTypes: ClassificationsItem[];
    diets: ClassificationsItem[];
    cuisines: ClassificationsItem[];
}

export interface ClassificationsItem {
    id: string;
    name: string;
    description: string;
    type: string;
}


export interface ClassificationsItemResponse {
    success: boolean;
    data: DishElement[];
    id: string;
    name: string;
}

// export interface ClassificationsItemData {

//     dish: DishElement[];
// }

export interface DishElement {
    dish?: DishDish;
    drink?: DishDish;
}

export interface DishDish {
    id: string;
    // restaurantId: string;
    name: string;
    // description: string;
    // price: string;
    // image: string;
    // createdAt: Date;
}