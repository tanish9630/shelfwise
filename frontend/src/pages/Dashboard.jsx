import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { LayoutDashboard, PieChart, Table, Settings, LogOut, Search, Plus, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const stats = [
    { label: "Total Items", value: "1,284", change: "+12.5%" },
    { label: "Storage Capacity", value: "84%", change: "Stable" },
    { label: "Active Alerts", value: "3", change: "-2 from yesterday" },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border flex flex-col bg-card">
        <div className="p-6">
          <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Shelfwise
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {[
            { icon: LayoutDashboard, label: "Overview", active: true },
            { icon: PieChart, label: "Analytics" },
            { icon: Table, label: "Inventory" },
            { icon: Settings, label: "Settings" },
          ].map((item, idx) => (
            <button key={idx} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${item.active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <Link to="/">
            <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
              <LogOut size={18} />
              Back to Landing
            </button>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        {/* Header */}
        <header className="h-16 border-bottom border-border flex items-center justify-between px-8 bg-card/50 backdrop-blur-md">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Search assets, items, or shelves..."
              className="w-full bg-muted/50 border border-border rounded-full py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Bell size={20} />
            </Button>
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs ring-2 ring-primary/20">
              JD
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
              <p className="text-muted-foreground">Welcome back, here's what's happening today.</p>
            </div>
            <Button className="gap-2">
              <Plus size={18} /> Add New Item
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats.map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-6 rounded-2xl bg-card border border-border shadow-sm"
              >
                <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <h3 className="text-2xl font-bold">{stat.value}</h3>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stat.change.includes('+') ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                    {stat.change}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Table Placeholder */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="font-bold">Recent Items</h3>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            <div className="p-12 text-center text-muted-foreground space-y-4">
              <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mx-auto opacity-50">
                <Table size={24} />
              </div>
              <p>No items added yet. Click "Add New Item" to get started.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
