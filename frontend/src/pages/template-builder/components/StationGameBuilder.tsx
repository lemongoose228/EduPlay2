import React, { useEffect, useMemo, useState } from 'react';
import type { StationTemplate } from '../../../features/templates/types/template.types';
import {
  buildStationConnections,
  createEmptyStationNode,
} from '../../../features/templates/utils/template.utils';
import { TEMPLATE_CONSTANTS } from '../../../features/templates/types/template.types';
import { Button } from '../../../shared/ui/Button/Button';
import { Card } from '../../../shared/ui/Card/Card';
import { Input } from '../../../shared/ui/Input/Input';
import './StationGameBuilder.css';

interface StationGameBuilderProps {
  initialData?: StationTemplate;
  onSave: (data: StationTemplate) => void;
  onCancel: () => void;
}

export const StationGameBuilder: React.FC<StationGameBuilderProps> = ({
  initialData,
  onSave,
  onCancel,
}) => {
  const [gameName, setGameName] = useState(initialData?.name || '');
  const [stations, setStations] = useState(
    initialData?.stations ?? [
      createEmptyStationNode(0),
      createEmptyStationNode(1),
      createEmptyStationNode(2),
    ],
  );

  const stationsCount = stations.length;

  useEffect(() => {
    if (stations.length < TEMPLATE_CONSTANTS.MIN_STATIONS) {
      const next = [...stations];
      while (next.length < TEMPLATE_CONSTANTS.MIN_STATIONS) {
        next.push(createEmptyStationNode(next.length));
      }
      setStations(next);
    }
  }, [stations]);

  const canAdd = stationsCount < TEMPLATE_CONSTANTS.MAX_STATIONS;
  const canRemove = stationsCount > TEMPLATE_CONSTANTS.MIN_STATIONS;

  const connections = useMemo(() => buildStationConnections(stations), [stations]);

  const updateStation = (
    id: string,
    field: 'name' | 'task' | 'shape' | 'color',
    value: string,
  ) => {
    setStations((prev) =>
      prev.map((station) => (station.id === id ? { ...station, [field]: value } : station)),
    );
  };

  const addStation = () => {
    if (!canAdd) return;
    setStations((prev) => [...prev, createEmptyStationNode(prev.length)]);
  };

  const removeStation = (id: string) => {
    if (!canRemove) return;
    setStations((prev) => prev.filter((station) => station.id !== id));
  };

  const validate = () => {
    if (!gameName.trim()) {
      alert('Введите название игры');
      return false;
    }

    if (stations.length < TEMPLATE_CONSTANTS.MIN_STATIONS) {
      alert(`Минимум ${TEMPLATE_CONSTANTS.MIN_STATIONS} станции`);
      return false;
    }

    for (const station of stations) {
      if (!station.name.trim() || !station.task.trim()) {
        alert('Заполните название и задание для каждой станции');
        return false;
      }
    }

    return true;
  };

  const handleSave = () => {
    if (!validate()) return;

    onSave({
      ...initialData,
      name: gameName.trim(),
      type: 'station',
      layout: 'line',
      stations: stations.map((station) => ({
        ...station,
        name: station.name.trim(),
        task: station.task.trim(),
      })),
      connections,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="station-game-builder">
      <div className="builder-header">
        <div>
          <h2 className="builder-title">Конструктор "Station Game"</h2>
          <p className="builder-subtitle">Вертикальный зигзаг с путём между станциями и кастомным стилем узлов</p>
        </div>
        <div className="header-actions">
          <Button variant="secondary" onClick={onCancel}>
            Отмена
          </Button>
          <Button onClick={handleSave}>Сохранить игру</Button>
        </div>
      </div>

      <Card title="Основная информация">
        <div className="station-basic-grid">
          <Input
            label="Название игры"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            placeholder="Введите название игры"
          />
          <div className="station-route-badge">Маршрут: вертикальная линия со связями «змейкой» (как в Duolingo)</div>
        </div>
      </Card>

      <Card title={`Станции (${stations.length})`}>
        <div className="station-list">
          {stations.map((station, index) => (
            <div key={station.id} className="station-item">
              <div className="station-item-header">
                <strong>{index + 1}. Станция</strong>
                <Button variant="danger" size="small" disabled={!canRemove} onClick={() => removeStation(station.id)}>
                  Удалить
                </Button>
              </div>
              <Input
                label="Название станции"
                value={station.name}
                onChange={(e) => updateStation(station.id, 'name', e.target.value)}
                placeholder="Например: Станция логики"
              />
              <Input
                label="Задание"
                value={station.task}
                onChange={(e) => updateStation(station.id, 'task', e.target.value)}
                placeholder="Введите задание станции"
              />
              <div className="station-style-grid">
                <label className="station-style-field">
                  <span>Форма</span>
                  <select
                    value={station.shape}
                    onChange={(e) => updateStation(station.id, 'shape', e.target.value)}
                  >
                    <option value="circle">Круг</option>
                    <option value="star">Звезда</option>
                    <option value="heart">Сердечко</option>
                    <option value="triangle">Треугольник</option>
                    <option value="square">Квадрат</option>
                  </select>
                </label>
                <label className="station-style-field">
                  <span>Цвет станции</span>
                  <div className="station-color-row">
                    <input
                      type="color"
                      value={station.color}
                      onChange={(e) => updateStation(station.id, 'color', e.target.value)}
                    />
                    <code>{station.color}</code>
                  </div>
                </label>
              </div>
            </div>
          ))}
        </div>
        <div className="station-footer-actions">
          <Button variant="outline" onClick={addStation} disabled={!canAdd}>
            + Добавить станцию
          </Button>
          <span>
            Связей маршрута: <strong>{connections.length}</strong>
          </span>
        </div>
      </Card>
    </div>
  );
};
