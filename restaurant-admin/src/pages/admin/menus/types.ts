export interface Menu {
	success: boolean;
	data: MenuData[];
}

export interface MenuData {
	id: string;
	name: string;
	image: string;
	description: string;
	startTime: string | null;
	endTime: string | null;
	active: boolean;
}

export interface MenuSection {
	id: string;
	index: number;
	name: string;
	sortOrder: number;
	menuId: string;
	description: string;
}
export interface ClassifiedMenuItems {
	id: string;
	name: string;
	sections: Section[];
}

export interface Section {
	name: string;
	id: string;
	sortOrder: number;
}
