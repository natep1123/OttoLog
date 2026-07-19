import { TextInputProps } from 'react-native';
import { listExerciseTemplates } from '../../lib/exerciseTemplates';
import type { ExerciseTemplateRow } from '../../types/exerciseTemplate';
import { TemplateNameSearch } from './TemplateNameSearch';

type Props = Omit<TextInputProps, 'value' | 'onChangeText'> & {
  value: string;
  onChangeText: (text: string) => void;
  /** Called when user picks an existing library template from search */
  onPickTemplate?: (template: ExerciseTemplateRow) => void;
};

/**
 * Exercise name field with typeahead over exercise_templates.
 */
export function ExerciseNameSearch({
  value,
  onChangeText,
  onPickTemplate,
  placeholder = 'Search library or type a name…',
  ...rest
}: Props) {
  return (
    <TemplateNameSearch
      kind="exercise"
      value={value}
      onChangeText={onChangeText}
      listTemplates={listExerciseTemplates}
      onPickTemplate={onPickTemplate}
      placeholder={placeholder}
      resultMeta="Library template"
      {...rest}
    />
  );
}
