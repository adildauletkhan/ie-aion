import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Layers, Eye, EyeOff, MapPin, TrendingUp, Activity } from 'lucide-react';

interface MapLayer {
  id: string;
  name: string;
  url: string;
  visible: boolean;
  style?: any;
  color?: string;
  category?: 'geometry' | 'isolines' | 'objects';
}

interface FormationMapViewerProps {
  oilFieldId: number;
  fieldName: string;
}

export function FormationMapViewer({ oilFieldId, fieldName }: FormationMapViewerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<{ [key: string]: L.GeoJSON }>({});
  
  const [layers, setLayers] = useState<MapLayer[]>([
    {
      id: 'boundary',
      name: 'Контур месторождения',
      url: '/maps/zhetybai/field_boundary.geojson',
      visible: true,
      color: '#FF6B6B',
      category: 'geometry'
    },
    {
      id: 'zones',
      name: 'Зоны дренирования',
      url: '/maps/zhetybai/drainage_zones.geojson',
      visible: true,
      color: '#FFD93D',
      category: 'geometry'
    },
    {
      id: 'thickness',
      name: 'Эффективная толщина',
      url: '/maps/zhetybai/thickness_isolines.geojson',
      visible: true,
      color: '#FFA500',
      category: 'isolines'
    },
    {
      id: 'porosity',
      name: 'Пористость',
      url: '/maps/zhetybai/porosity_isolines.geojson',
      visible: true,
      color: '#4682B4',
      category: 'isolines'
    },
    {
      id: 'wells',
      name: 'Скважины',
      url: '/maps/zhetybai/wells.geojson',
      visible: true,
      color: '#27AE60',
      category: 'objects'
    },
    {
      id: 'faults',
      name: 'Тектонические нарушения',
      url: '/maps/zhetybai/faults.geojson',
      visible: false,
      color: '#8B4513',
      category: 'objects'
    }
  ]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([43.84, 51.81], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    mapRef.current = map;

    layers.forEach(layer => {
      if (layer.visible) {
        loadLayer(layer);
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const loadLayer = async (layer: MapLayer) => {
    if (!mapRef.current) return;

    try {
      const response = await fetch(layer.url);
      if (!response.ok) {
        console.error(`Failed to load ${layer.name}`);
        return;
      }
      
      const data = await response.json();

      const geoJsonLayer = L.geoJSON(data, {
        style: (feature) => {
          if (layer.id === 'thickness' || layer.id === 'porosity' || layer.id === 'faults') {
            return {
              color: feature?.properties?.color || layer.color,
              weight: 2,
              dashArray: layer.id === 'porosity' ? '5, 5' : layer.id === 'faults' ? '10, 5' : undefined
            };
          }
          if (layer.id === 'boundary') {
            return {
              color: feature?.properties?.name?.includes('Внешний') ? '#FF6B6B' : '#4ECDC4',
              weight: 2,
              fillOpacity: 0.1
            };
          }
          if (layer.id === 'zones') {
            return {
              color: '#FFD93D',
              weight: 2,
              fillOpacity: 0.2
            };
          }
          return { color: layer.color, weight: 2 };
        },
        pointToLayer: (feature, latlng) => {
          if (layer.id === 'wells') {
            const type = feature.properties?.type;
            const status = feature.properties?.status;
            let color = '#999';
            
            if (type === 'Добывающая') color = status === 'Действующая' ? '#27AE60' : '#E74C3C';
            if (type === 'Нагнетательная') color = '#3498DB';
            if (type === 'Наблюдательная') color = '#95A5A6';

            return L.circleMarker(latlng, {
              radius: 6,
              fillColor: color,
              color: '#fff',
              weight: 2,
              opacity: 1,
              fillOpacity: 0.8
            });
          }
          return L.marker(latlng);
        },
        onEachFeature: (feature, layer) => {
          if (feature.properties) {
            let popup = '<div class="text-sm">';
            
            if (feature.properties.well_number) {
              const p = feature.properties;
              popup += `<b>Скважина ${p.well_number}</b><br/>`;
              popup += `Тип: ${p.type}<br/>`;
              popup += `Статус: ${p.status}<br/>`;
              if (p.production_rate) popup += `Дебит: ${p.production_rate} т/сут<br/>`;
              if (p.injection_rate) popup += `Приёмистость: ${p.injection_rate} м³/сут<br/>`;
            } else if (feature.properties.zone_code) {
              const p = feature.properties;
              popup += `<b>${p.zone_name}</b><br/>`;
              popup += `Код: ${p.zone_code}<br/>`;
              popup += `КИН: ${p.current_kin}%<br/>`;
              popup += `Запасы остаточные: ${p.reserves_remaining?.toLocaleString()} т`;
            } else if (feature.properties.parameter) {
              const p = feature.properties;
              popup += `<b>${p.parameter === 'effective_thickness' ? 'Толщина' : 'Пористость'}: ${p.value} ${p.unit}</b>`;
            } else if (feature.properties.name) {
              popup += `<b>${feature.properties.name}</b>`;
              if (feature.properties.area_km2) {
                popup += `<br/>Площадь: ${feature.properties.area_km2} км²`;
              }
            } else if (feature.properties.fault_name) {
              const p = feature.properties;
              popup += `<b>${p.fault_name}</b><br/>`;
              popup += `Тип: ${p.type}<br/>`;
              popup += `Амплитуда: ${p.amplitude_m} м`;
            }
            
            popup += '</div>';
            layer.bindPopup(popup);
          }
        }
      });

      if (mapRef.current) {
        geoJsonLayer.addTo(mapRef.current);
        layersRef.current[layer.id] = geoJsonLayer;
      }
    } catch (error) {
      console.error(`Error loading layer ${layer.name}:`, error);
    }
  };

  const toggleLayer = (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;

    const newVisible = !layer.visible;
    
    if (newVisible) {
      loadLayer(layer);
    } else {
      const geoJsonLayer = layersRef.current[layerId];
      if (geoJsonLayer && mapRef.current) {
        mapRef.current.removeLayer(geoJsonLayer);
        delete layersRef.current[layerId];
      }
    }

    setLayers(prev => prev.map(l => 
      l.id === layerId ? { ...l, visible: newVisible } : l
    ));
  };

  const geometryLayers = layers.filter(l => l.category === 'geometry');
  const isolineLayers = layers.filter(l => l.category === 'isolines');
  const objectLayers = layers.filter(l => l.category === 'objects');
  const activeCount = layers.filter(l => l.visible).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Карта пласта: {fieldName}</h3>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
          <Layers className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">{activeCount} из {layers.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_240px] gap-4">
        <Card className="p-0 overflow-hidden shadow-md">
          <div 
            ref={mapContainerRef} 
            className="h-[520px] w-full"
            style={{ zIndex: 0 }}
          />
        </Card>

        <div className="space-y-3">
          <Card className="p-4 shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="h-4 w-4" />
              <h4 className="text-sm font-semibold">Слои карты</h4>
            </div>
            
            <div className="space-y-4">
              {/* Геометрия */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Геометрия</span>
                </div>
                <div className="space-y-1.5">
                  {geometryLayers.map(layer => (
                    <button
                      key={layer.id}
                      onClick={() => toggleLayer(layer.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-all ${
                        layer.visible 
                          ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90' 
                          : 'bg-muted text-muted-foreground hover:bg-muted/70'
                      }`}
                    >
                      {layer.visible ? (
                        <Eye className="h-3.5 w-3.5 flex-shrink-0" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5 flex-shrink-0" />
                      )}
                      <span 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: layer.color }}
                      />
                      <span className="flex-1 text-left font-medium">{layer.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Изолинии */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Изолинии</span>
                </div>
                <div className="space-y-1.5">
                  {isolineLayers.map(layer => (
                    <button
                      key={layer.id}
                      onClick={() => toggleLayer(layer.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-all ${
                        layer.visible 
                          ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90' 
                          : 'bg-muted text-muted-foreground hover:bg-muted/70'
                      }`}
                    >
                      {layer.visible ? (
                        <Eye className="h-3.5 w-3.5 flex-shrink-0" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5 flex-shrink-0" />
                      )}
                      <span 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: layer.color }}
                      />
                      <span className="flex-1 text-left font-medium">{layer.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Объекты */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Объекты</span>
                </div>
                <div className="space-y-1.5">
                  {objectLayers.map(layer => (
                    <button
                      key={layer.id}
                      onClick={() => toggleLayer(layer.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-all ${
                        layer.visible 
                          ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90' 
                          : 'bg-muted text-muted-foreground hover:bg-muted/70'
                      }`}
                    >
                      {layer.visible ? (
                        <Eye className="h-3.5 w-3.5 flex-shrink-0" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5 flex-shrink-0" />
                      )}
                      <span 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: layer.color }}
                      />
                      <span className="flex-1 text-left font-medium">{layer.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-3 bg-muted/30">
            <p className="text-xs text-muted-foreground leading-relaxed">
              💡 Нажмите на объекты карты для просмотра детальной информации
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
