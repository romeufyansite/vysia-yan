export interface ScreenGroup {
  id: string;
  org_id: string;
  name: string;
  created_at: string;
}

export type AppType = 'image' | 'image-slideshow' | 'video' | 'website';

export interface PlaylistGroup {
  id: string;
  org_id: string;
  name: string;
  created_at: string;
}

export interface Playlist {
  id: string;
  org_id: string;
  name: string;
  color?: string;
  transition_speed?: string;
  group_id?: string | null;
  orientation?: ScreenOrientation;
  created_at: string;
  updated_at: string;
}

export interface PlaylistItem {
  id: string;
  playlist_id: string;
  app_type: string;
  order_index: number;
  config: any;
  duration: number;
  created_at: string;
  updated_at?: string;
}

export interface ImageConfig {
  src: string;
  fit?: 'cover' | 'contain';
  duration?: number;
}

export interface ImageSlideshowConfig {
  images: { src: string; duration?: number }[];
  fit?: 'cover' | 'contain';
}

export interface VideoConfig {
  src: string;
  mute?: boolean;
  loop?: boolean;
}

export interface WebsiteConfig {
  url: string;
  reloadEvery?: number;
}

export type ScreenOrientation = 'landscape' | 'portrait';
export type ScreenStatus = 'online' | 'offline';
export type DeviceType = 'connected_tv' | 'web_browser' | 'non_connected_tv';
export type ScreenRotation = 'normal' | '90' | '180' | '270';
export type ZoneTemplate = 'fullscreen' | '70-30' | '30-70' | 'banner';

export interface Zone {
  id: string;
  /** Playlist affichée dans cette zone (éditeur + lecteur). */
  playlist_id?: string | null;
  /** @deprecated Ancien éditeur : type de média par zone ; conservé pour rétrocompat JSON. */
  type?: 'image' | 'video' | 'slideshow-image' | 'slideshow-video';
  content?: string;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface Overlay {
  id: string;
  type: 'clock' | 'weather' | 'announcement' | 'logo';
  enabled: boolean;
  position: {
    x: number;
    y: number;
  };
  config?: {
    city?: string;
    unit?: 'celsius' | 'fahrenheit';
    text?: string;
    imageUrl?: string;
  };
}

export interface Screen {
  id: string;
  org_id: string;
  name: string;
  status: ScreenStatus;
  device_type?: DeviceType;
  last_seen_at?: string | null;
  last_activity?: string;
  device_jwt?: string | null;
  playlist_id: string | null;
  group_id: string | null;
  orientation?: ScreenOrientation;
  rotation?: ScreenRotation;
  presentation_mode?: boolean;
  template?: ZoneTemplate;
  zones?: Zone[];
  overlays?: Overlay[];
  scene_version?: number;
  created_at: string;
  playlist?: Playlist;
  screen_group?: ScreenGroup;
}

export interface MediaFolder {
  id: string;
  org_id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaAsset {
  id: string;
  org_id: string;
  folder_id: string | null;
  name: string;
  file_url: string;
  file_type: 'image' | 'video' | 'document';
  file_size: number;
  mime_type: string;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  created_at: string;
  updated_at: string;
}
