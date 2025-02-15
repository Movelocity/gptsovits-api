import { ReactNode } from 'react';

export interface NavItem {
    key: string;
    label: string;
    path: string;
    icon?: ReactNode;
}

export interface Breadcrumb {
    label: string;
    path: string;
}

export interface PageHeader {
    title: string;
    breadcrumbs: Breadcrumb[];
    actions?: ReactNode;
} 