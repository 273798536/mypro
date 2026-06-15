import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { guideAPI } from '../api';

function GuidePanel({ onClose }) {
  const [guide, setGuide] = useState(null);
  const [activeTab, setActiveTab] = useState('examples');

  useEffect(() => {
    guideAPI.getGuide().then(res => setGuide(res.data));
  }, []);

  if (!guide) return null;

  return (
    <div className="guide-panel">
      <h3>
        📋 {guide.title}
        <button 
          className="btn btn-sm btn-outline" 
          style={{ marginLeft: 'auto' }}
          onClick={onClose}
        >
          收起
        </button>
      </h3>
      
      <div className="tabs">
        {guide.sections.map(section => (
          <div
            key={section.key}
            className={`tab ${activeTab === section.key ? 'active' : ''}`}
            onClick={() => setActiveTab(section.key)}
          >
            {section.title}
          </div>
        ))}
      </div>

      {guide.sections.map(section => (
        activeTab === section.key && (
          <div key={section.key} style={{ padding: '0.5rem 0' }}>
            <p style={{ fontSize: '0.9rem', color: '#4b5563', lineHeight: '1.7' }}>
              {section.content}
            </p>
          </div>
        )
      ))}

      <div className="quick-links">
        {guide.quickLinks.map((link, idx) => (
          <Link 
            key={idx} 
            to={link.path.replace(':id', '1')}
            className="quick-link"
          >
            📍 {link.label}
            <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>
              {link.description}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default GuidePanel;
