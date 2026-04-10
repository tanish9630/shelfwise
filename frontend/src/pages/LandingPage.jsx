import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BookOpen, BarChart3, Cloud, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Navbar = () => (
  <nav className="navbar">
    <div className="logo">Shelfwise</div>
    <div className="nav-links">
      <a href="#features" className="nav-link">Features</a>
      <a href="#" className="nav-link">Solutions</a>
      <a href="#" className="nav-link">Pricing</a>
      <a href="#" className="nav-link">About</a>
    </div>
    <Link to="/dashboard">
      <Button className="font-semibold px-6">
        Get Started
      </Button>
    </Link>
  </nav>
);

const FeatureCard = ({ icon: Icon, title, description, delay }) => (
  <motion.div 
    className="feature-card"
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
  >
    <div className="feature-icon">
      <Icon size={24} />
    </div>
    <h3>{title}</h3>
    <p>{description}</p>
  </motion.div>
);

export default function LandingPage() {
  const features = [
    {
      icon: BookOpen,
      title: "Smart Cataloging",
      description: "Auto-organize your inventory with AI-driven categorization and metadata extraction.",
      delay: 0.1
    },
    {
      icon: BarChart3,
      title: "Real-time Analytics",
      description: "Deep insights into your consumption patterns and shelf turnover rates.",
      delay: 0.2
    },
    {
      icon: Cloud,
      title: "Cloud Sync",
      description: "Access your catalog from anywhere. Seamlessly sync across all your devices.",
      delay: 0.3
    }
  ];

  return (
    <div className="app-container">
      <div className="bg-gradient" />
      <Navbar />
      
      <main className="hero">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <span className="hero-badge">New: Shelfwise AI is here</span>
          <h1 className="hero-title">
            Intelligent <br />
            <span style={{ color: 'var(--primary)' }}>Shelf Management</span>
          </h1>
          <p className="hero-subtitle">
            The next generation of inventory tracking. Effortless, automated, and insights-driven 
            management for the modern warehouse and personal library.
          </p>
          
          <div className="cta-group">
            <Link to="/dashboard">
              <Button size="lg" className="h-12 px-8 text-md gap-2">
                Launch Dashboard <ArrowRight size={18} />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="h-12 px-8 text-md">
              Watch Demo
            </Button>
          </div>

          <motion.div 
            className="hero-image-container"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
          >
            <img src="/hero.png" alt="Shelfwise Smart Shelving" className="hero-image" />
          </motion.div>
        </motion.div>
      </main>

      <section id="features" className="features">
        {features.map((feature, idx) => (
          <FeatureCard key={idx} {...feature} />
        ))}
      </section>

      <footer style={{ padding: '4rem', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.9rem', borderTop: '1px solid var(--border)', marginTop: '4rem' }}>
        <p>© 2024 Shelfwise Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
