/** Structure renvoyée par la fonction Edge `company-description-ai` (action analyze). */

export interface CompanyDescriptionAiWritingStyle {
  tone?: string;
  formality?: string;
  vocabulary?: string;
  perspective?: string;
}

export interface CompanyDescriptionAiVisualDirection {
  mood?: string;
  imagery?: string;
  layout_hint?: string;
  color_association?: string;
}

export interface CompanyDescriptionAiProfile {
  summary?: string;
  writing_style?: CompanyDescriptionAiWritingStyle;
  visual_direction?: CompanyDescriptionAiVisualDirection;
  brand_personality?: string;
  target_audience?: string;
  key_offerings?: string[];
  keywords_for_visuals?: string[];
  avoid_or_constraints?: string;
}
