import { useState } from 'react';
import { Battery, Brain } from 'lucide-react';
import { useStore } from '../store';

export function MoodTracker() {
  const { currentMood, setCurrentMood, logMood } = useStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSave = () => {
    logMood(currentMood.energy, currentMood.focus);
    setIsExpanded(false);
  };

  return (
    <div className="mood-tracker">
      <div className="mood-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h3>Как вы себя чувствуете?</h3>
        <span className="mood-toggle">{isExpanded ? '▼' : '▶'}</span>
      </div>

      {isExpanded && (
        <div className="mood-content">
          <div className="mood-slider">
            <div className="slider-header">
              <Battery size={20} />
              <span>Энергия</span>
              <span className="slider-value">{currentMood.energy}/10</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={currentMood.energy}
              onChange={(e) => setCurrentMood(+e.target.value, currentMood.focus)}
              className="slider"
            />
          </div>

          <div className="mood-slider">
            <div className="slider-header">
              <Brain size={20} />
              <span>Фокус</span>
              <span className="slider-value">{currentMood.focus}/10</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={currentMood.focus}
              onChange={(e) => setCurrentMood(currentMood.energy, +e.target.value)}
              className="slider"
            />
          </div>

          <button className="mood-save-btn" onClick={handleSave}>
            💾 Сохранить
          </button>
        </div>
      )}
    </div>
  );
}
