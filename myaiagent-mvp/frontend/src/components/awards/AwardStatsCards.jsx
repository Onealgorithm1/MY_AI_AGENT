import React from 'react';
import { Award, DollarSign, TrendingUp, Calendar, Building2 } from 'lucide-react';

const StatCard = ({ title, value, subtext, icon: Icon, color }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
                {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
            </div>
            <div className={`p-3 rounded-full ${color}`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
        </div>
    </div>
);

const AwardStatsCards = ({ stats }) => {
    if (!stats) return null;

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
            notation: 'compact'
        }).format(val || 0);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
                title="Total Awards Won"
                value={stats.total_awards || 0}
                subtext="Lifetime contract awards"
                icon={Award}
                color="bg-blue-500"
            />
            <StatCard
                title="Total Contract Value"
                value={formatCurrency(stats.total_value)}
                subtext={`Avg: ${formatCurrency(stats.average_value)}`}
                icon={DollarSign}
                color="bg-green-500"
            />
            <StatCard
                title="Active Agencies"
                value={stats.distinct_agencies || 0}
                subtext="Unique contracting agencies"
                icon={Building2}
                color="bg-purple-500"
            />
            <StatCard
                title="Active Years"
                value={stats.first_award_date ? `${new Date(stats.first_award_date).getFullYear()} - Present` : 'N/A'}
                subtext="Contracting history"
                icon={Calendar}
                color="bg-orange-500"
            />
        </div>
    );
};

export default AwardStatsCards;
