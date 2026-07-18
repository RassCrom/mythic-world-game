import React from 'react';
import { useI18n } from '../../i18n/index.jsx';
import { ANIMALS } from './animals.js';

export default function AnimalPicker({ value, onChange }) {
  const { t } = useI18n();
  return (
    <fieldset className="animal-picker">
      <legend>{t('Choose your animal')}</legend>
      <div className="animal-options">
        {ANIMALS.map((animal) => (
          <label key={animal.id} className="animal-option">
            <input
              type="radio"
              name="animal"
              value={animal.id}
              checked={value === animal.id}
              onChange={() => onChange(animal.id)}
            />
            <span>{t(animal.label)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
