import { useState } from 'react';
import { Wrench, Users } from 'lucide-react';
import Splitter from './tools/Splitter';

const TOOLS = [
  { id: 'splitter', label: 'Expense Splitter', icon: Users, description: 'Split bills among friends, trips, or flatmates.' },
];

export default function Tools() {
  const [activeTool, setActiveTool] = useState(null);

  if (activeTool === 'splitter') return <Splitter onBack={() => setActiveTool(null)} />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Tools</h1>
        <p className="text-sm text-gray-500 mt-0.5">Extra utilities for your finances</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className="text-left bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center mb-3 group-hover:bg-indigo-100 transition-colors">
              <tool.icon size={20} className="text-indigo-600" />
            </div>
            <p className="font-semibold text-gray-900">{tool.label}</p>
            <p className="text-sm text-gray-500 mt-1">{tool.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
