import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare, Sparkles, BarChart3, FileText, Calendar, Users,
  Building2, Target, TrendingUp, Zap, Shield, Globe, Award,
  CheckCircle, ArrowRight, Play
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    { icon: MessageSquare, name: 'AI Chat', color: 'from-blue-500 to-blue-600' },
    { icon: FileText, name: 'SAM.gov', color: 'from-purple-500 to-purple-600' },
    { icon: Building2, name: 'Company Dashboard', color: 'from-green-500 to-green-600' },
    { icon: BarChart3, name: 'Contract Analytics', color: 'from-orange-500 to-orange-600' },
    { icon: Target, name: 'Opportunity Matching', color: 'from-pink-500 to-pink-600' },
    { icon: TrendingUp, name: 'Market Intelligence', color: 'from-indigo-500 to-indigo-600' },
    { icon: Users, name: 'Team Collaboration', color: 'from-teal-500 to-teal-600' },
    { icon: Award, name: 'Proposal Workspace', color: 'from-yellow-500 to-yellow-600' },
  ];

  const benefits = [
    {
      title: 'AI-Powered Intelligence',
      description: 'Advanced AI that understands federal contracting, analyzes opportunities, and provides actionable insights.',
      icon: Sparkles,
    },
    {
      title: 'All-in-One Platform',
      description: 'Everything you need for federal contracting - from opportunity discovery to proposal management.',
      icon: Globe,
    },
    {
      title: 'Real-Time Updates',
      description: 'Stay ahead with automatic monitoring of SAM.gov opportunities and instant notifications.',
      icon: Zap,
    },
  ];

  const testimonials = [
    {
      quote: "This AI agent transformed how we find and win federal contracts. The opportunity matching is incredibly accurate.",
      author: "Sarah Chen",
      role: "Business Development Director",
      company: "Tech Solutions Inc."
    },
    {
      quote: "The AI market analysis feature alone saved us hundreds of hours of research. It's like having a federal contracting expert on staff.",
      author: "Michael Rodriguez",
      role: "CEO",
      company: "Innovation Labs"
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">werkules</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
              <a href="#benefits" className="text-gray-600 hover:text-gray-900">Benefits</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</a>
              <button
                onClick={() => navigate('/login')}
                className="text-gray-600 hover:text-gray-900"
              >
                Sign in
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
              Federal contracting <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">powered by AI</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Simple, intelligent, yet powerful. Win more federal contracts with AI-powered opportunity matching, market intelligence, and automated proposal assistance.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => navigate('/signup')}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                className="px-8 py-4 bg-white hover:bg-gray-50 text-gray-900 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2 border border-gray-200"
              >
                <Play className="w-5 h-5" />
                Watch Demo
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-6">
              No credit card required • Free 14-day trial • Cancel anytime
            </p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Imagine a vast collection of AI-powered tools
            </h2>
            <p className="text-xl text-gray-600">
              Every tool you need for federal contracting success, perfectly integrated.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="group bg-white p-6 rounded-xl shadow-sm hover:shadow-xl transition-all cursor-pointer border border-gray-100 hover:border-blue-200"
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {feature.name}
                </h3>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button className="text-blue-600 hover:text-blue-700 font-semibold text-lg flex items-center gap-2 mx-auto">
              View all Features
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div id="benefits" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              If you simplify everything, you can win anything
            </h2>
            <p className="text-xl text-gray-600 italic">
              "The future of federal contracting is AI-powered."
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, idx) => (
              <div key={idx} className="text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <benefit.icon className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  {benefit.title}
                </h3>
                <p className="text-lg text-gray-600">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Value Propositions */}
      <div className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Federal contracting intelligence done right
              </h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">AI-Powered</h3>
                    <p className="text-gray-600">Advanced AI that understands your business and matches you with the right opportunities.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">Real-Time SAM.gov Integration</h3>
                    <p className="text-gray-600">Direct integration with SAM.gov for instant opportunity discovery and updates.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">Market Intelligence</h3>
                    <p className="text-gray-600">Access spending trends, competitor analysis, and win probability estimates.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">No Lock-in</h3>
                    <p className="text-gray-600">Your data is yours. Export anytime, cancel anytime. No long-term contracts.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-2xl">
              <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Play className="w-20 h-20 text-white" />
              </div>
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Setup Time</span>
                  <span className="font-semibold text-gray-900">5 minutes</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Opportunities Found</span>
                  <span className="font-semibold text-green-600">10,000+</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">AI Accuracy</span>
                  <span className="font-semibold text-blue-600">95%+</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Join thousands of happy users
            </h2>
            <p className="text-xl text-gray-600">
              who win more federal contracts with AI
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, idx) => (
              <div key={idx} className="bg-gray-50 p-8 rounded-xl">
                <p className="text-lg text-gray-700 mb-6 italic">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {testimonial.author.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.author}</p>
                    <p className="text-sm text-gray-600">{testimonial.role}, {testimonial.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div id="pricing" className="py-20 bg-gradient-to-br from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Unleash your growth potential
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Start winning more federal contracts today with AI-powered intelligence
          </p>
          <button
            onClick={() => navigate('/signup')}
            className="px-8 py-4 bg-white hover:bg-gray-100 text-blue-600 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all inline-flex items-center gap-2"
          >
            Start Free Trial
            <ArrowRight className="w-5 h-5" />
          </button>
          <p className="text-sm mt-6 opacity-75">
            No credit card required • Instant access • Free 14-day trial
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-6 h-6" />
                <span className="font-bold text-lg">werkules</span>
              </div>
              <p className="text-gray-400 text-sm">
                AI-powered federal contracting intelligence platform that helps you discover, analyze, and win more contracts.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Security</a></li>
                <li><a href="#" className="hover:text-white">Roadmap</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/privacy" className="hover:text-white">Privacy</a></li>
                <li><a href="/terms" className="hover:text-white">Terms</a></li>
                <li><a href="#" className="hover:text-white">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm text-gray-400">
            <p>© 2025 werkules. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
