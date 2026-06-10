export interface UpdateManifest {
  version: string;
  pub_date: string;
  platform: 'windows';
  download_url: string;
  file_name: string;
  sha256: string;
  size_bytes: number;
  mandatory: boolean;
  min_supported_version: string;
  notes: string;
}

export interface UpdateManifestValidation {
  ok: boolean;
  manifest?: UpdateManifest;
  error?: string;
}
