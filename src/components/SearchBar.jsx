import { useState, useRef, useEffect } from 'react';
import { geocode } from '../lib/routing.js';

export default function SearchBar({ onSelect, disabled }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const searchResults = await geocode(value);
        setResults(searchResults);
        setShowResults(true);
      } catch (err) {
        console.error('Geocoding error:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  const handleSelect = (result) => {
    setQuery(result.name.split(',')[0]); // Show first part of name
    setShowResults(false);
    onSelect(result);
  };

  return (
    <div ref={containerRef} style={containerStyle}>
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => results.length > 0 && setShowResults(true)}
        placeholder="Search destination..."
        disabled={disabled}
        style={inputStyle}
      />
      {isLoading && <span style={loadingStyle}>...</span>}

      {showResults && results.length > 0 && (
        <ul style={resultsStyle}>
          {results.map((result, index) => (
            <li
              key={index}
              onClick={() => handleSelect(result)}
              style={resultItemStyle}
            >
              {result.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const containerStyle = {
  position: 'relative',
  width: '100%',
  maxWidth: '400px'
};

const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  fontSize: '16px',
  border: 'none',
  borderRadius: '8px',
  background: 'white',
  boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
  outline: 'none',
  boxSizing: 'border-box'
};

const loadingStyle = {
  position: 'absolute',
  right: '16px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#666'
};

const resultsStyle = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  marginTop: '4px',
  padding: 0,
  background: 'white',
  borderRadius: '8px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
  listStyle: 'none',
  maxHeight: '240px',
  overflowY: 'auto',
  zIndex: 1000
};

const resultItemStyle = {
  padding: '12px 16px',
  cursor: 'pointer',
  borderBottom: '1px solid #eee',
  fontSize: '14px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
};
