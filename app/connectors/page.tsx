'use client'

import React from 'react';

const LandingPage = () => {
  const handleSummariseMeeting = () => {
    console.log('Summarise meeting clicked');
    // Add your navigation or functionality here
  };

  const handleConnectSlack = () => {
    console.log('Connect to Slack clicked');

    window.location.href = "/api/connectors/slack/start";
    // Add your navigation or functionality here
  };

  const handleConnectJira = async () => {
    try {
      const res = await fetch("/api/connectors/jira/status", { cache: "no-store" });
      const data = await res.json();

      if (data.connected) {
        // Already connected → go directly to dashboard
        window.location.href = "/jira-dashboard";
      } else {
        // Not connected → start OAuth
        window.location.href = "/api/connectors/jira/oauth/start";
      }
    } catch (err) {
      console.error("Jira connect error:", err);
      window.location.href = "/api/connectors/jira/oauth/start";
    }
  };
  const handleCalendar = () => {
    console.log('Calendar clicked');
    // Add your navigation or functionality here
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="py-6 px-8 border-b border-yellow-500/20">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-yellow-400">
            WorkSync Pro
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Section */}
          <div className="mb-16">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Streamline Your
              <span className="text-yellow-400 block">Workflow</span>
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Centralize your team collaboration with AI-powered meeting summaries,
              seamless integrations, and intelligent calendar management.
            </p>
          </div>

          {/* Action Buttons Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Summarise Meeting Button */}
            <button
              onClick={handleSummariseMeeting}
              className="group relative overflow-hidden bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-black font-semibold py-6 px-8 rounded-xl transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/25"
            >
              <div className="flex items-center justify-center space-x-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-lg">Summarise Latest Meeting</span>
              </div>
            </button>

            {/* Connect to Slack Button */}
            <button
              onClick={handleConnectSlack}
              className="group relative overflow-hidden bg-gray-900 border-2 border-yellow-400 hover:bg-yellow-400/10 text-yellow-400 hover:text-yellow-300 font-semibold py-6 px-8 rounded-xl transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-400/25"
            >
              <div className="flex items-center justify-center space-x-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-lg">Connect to Slack</span>
              </div>
            </button>

            {/* Connect to Jira Button */}
            <button
              onClick={handleConnectJira}
              className="group relative overflow-hidden bg-gray-900 border-2 border-yellow-400 hover:bg-yellow-400/10 text-yellow-400 hover:text-yellow-300 font-semibold py-6 px-8 rounded-xl transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-400/25"
            >
              <div className="flex items-center justify-center space-x-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span className="text-lg">Connect to Jira</span>
              </div>
            </button>

            {/* Calendar Button */}
            <button
              onClick={handleCalendar}
              className="group relative overflow-hidden bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-black font-semibold py-6 px-8 rounded-xl transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/25"
            >
              <div className="flex items-center justify-center space-x-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-lg">Calendar</span>
              </div>
            </button>
          </div>

          {/* Additional Info */}
          <div className="mt-16">
            <p className="text-gray-400 text-sm">
              Powered by AI • Secure • Real-time Sync
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-8 border-t border-yellow-500/20">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-400 text-sm">
            © 2025 WorkSync Pro. Built for productivity.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
