import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/Tabs";
import { ObjectsSettingsPanel, type ObjectsState } from "./ObjectsSettingsPanel";
import { DataViewBuilder } from "./DataViewBuilder";
import type { DataViewConfig } from "@/lib/dataViewFactory";

export function MockHostPanel({
  capabilities,
  dataViewConfig,
  onDataViewConfigChange,
  objects,
  onObjectsChange,
}: {
  capabilities: any;
  dataViewConfig: DataViewConfig;
  onDataViewConfigChange: (c: DataViewConfig) => void;
  objects: ObjectsState;
  onObjectsChange: (o: ObjectsState) => void;
}) {
  return (
    <div className="h-full overflow-y-auto">
      <Tabs defaultValue="format">
        <TabsList>
          <TabsTrigger value="format">Format</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>
        <TabsContent value="format" className="p-0">
          <ObjectsSettingsPanel capabilities={capabilities} value={objects} onChange={onObjectsChange} />
        </TabsContent>
        <TabsContent value="data" className="p-0">
          <DataViewBuilder capabilities={capabilities} value={dataViewConfig} onChange={onDataViewConfigChange} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
