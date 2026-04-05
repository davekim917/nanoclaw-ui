/** Workshop types — shared across all Workshop components. */

export interface BlueprintParameter {
  key: string;
  label: string;
  description?: string;
  type: 'text' | 'cron' | 'select' | 'number' | 'boolean';
  options?: string[];
  default?: string | number | boolean;
  required: boolean;
}

export interface CatalogEntry {
  id: string;
  version: string;
  name: string;
  description: string;
  trade: string;
  trigger_type: 'scheduled' | 'on-demand';
  estimated_setup_time: string;
  integrations: string[];
  author: string;
  verified: boolean;
  tags: string[];
}

export interface BlueprintSpec extends CatalogEntry {
  parameters: BlueprintParameter[];
  prompt_template: string;
}

export interface InstalledBlueprint {
  id: string;
  blueprint_id: string;
  blueprint_version: string;
  blueprint_name?: string;
  group_folder: string;
  chat_jid: string;
  config: string; // JSON string
  rendered_prompt: string;
  trigger_type: string;
  status: 'active' | 'disabled';
  scheduled_task_id: string | null;
  installed_at: string;
  update_available?: boolean;
  catalog_version?: string;
}

export interface CatalogIndex {
  schema_version: string;
  generated_at: string;
  blueprints: CatalogEntry[];
}

export interface IntegrationsStatus {
  [integration: string]: 'available' | 'missing';
}

export interface BlueprintSpecResponse extends BlueprintSpec {
  integrations_status?: IntegrationsStatus;
}

export type TradeFilter = string;
export type TriggerFilter = 'all' | 'scheduled' | 'on-demand';
export type StatusFilter = 'all' | 'installed' | 'available';
