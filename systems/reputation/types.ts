
import { ReputationType } from '../core/types';

export interface ReputationMilestone {
    id: string;
    label: string;
    description: string;
    trigger: {
        type: ReputationType;
        value: number;
        operator: '>=' | '<=';
    };
    icon: string; // Lucide icon name
    color: string; // Tailwind text color class
    effectDescription: string;
}
