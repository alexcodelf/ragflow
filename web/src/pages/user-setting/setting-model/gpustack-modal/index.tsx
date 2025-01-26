import { useTranslate } from '@/hooks/common-hooks';
import { IModalProps } from '@/interfaces/common';
import { IAddLlmRequestBody } from '@/interfaces/request/llm';
import {
  Flex,
  Form,
  FormInstance,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
} from 'antd';
import omit from 'lodash/omit';
import { memo, useCallback } from 'react';

const { Option } = Select;

const MODEL_CONFIG = {
  types: [
    { value: 'chat', label: 'chat' },
    { value: 'embedding', label: 'embedding' },
    { value: 'rerank', label: 'rerank' },
    { value: 'speech2text', label: 'sequence2text' },
    { value: 'tts', label: 'tts' },
  ],
  maxTokenTypes: ['chat', 'embedding', 'rerank'],
  defaultMaxTokens: 2048,
  defaultModelType: 'embedding',
  url: 'https://docs.gpustack.ai/latest/quickstart',
} as const;

type ModelType = (typeof MODEL_CONFIG.types)[number]['value'];
type MaxTokenModelType = (typeof MODEL_CONFIG.maxTokenTypes)[number];

interface FieldType {
  model_type: ModelType;
  llm_name: string;
  api_base: string;
  api_key: string;
  max_tokens?: number;
  vision?: boolean;
}

const useGPUStackForm = (
  onSubmit: ((data: IAddLlmRequestBody) => void) | undefined,
  llmFactory: string,
) => {
  const [form] = Form.useForm<FieldType>();

  const handleModelTypeChange = useCallback(
    (value: ModelType) => {
      if (!MODEL_CONFIG.maxTokenTypes.includes(value as MaxTokenModelType)) {
        form.setFieldValue('max_tokens', undefined);
      }
    },
    [form],
  );

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const modelType =
        values.model_type === 'chat' && values.vision
          ? 'image2text'
          : values.model_type;

      const data: IAddLlmRequestBody = {
        ...omit(values, ['vision']),
        model_type: modelType,
        llm_factory: llmFactory,
        max_tokens: MODEL_CONFIG.maxTokenTypes.includes(
          values.model_type as MaxTokenModelType,
        )
          ? values.max_tokens!
          : MODEL_CONFIG.defaultMaxTokens,
      };
      onSubmit?.(data);
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  }, [form, onSubmit, llmFactory]);

  return { form, handleModelTypeChange, handleSubmit };
};

const ModelTypeField = memo(
  ({ onChange }: { onChange: (value: ModelType) => void }) => {
    const { t } = useTranslate('setting');

    return (
      <Form.Item<FieldType>
        label={t('modelType')}
        name="model_type"
        rules={[{ required: true, message: t('modelTypeMessage') }]}
      >
        <Select placeholder={t('modelTypeMessage')} onChange={onChange}>
          {MODEL_CONFIG.types.map((option) => (
            <Option key={option.value} value={option.value}>
              {option.label}
            </Option>
          ))}
        </Select>
      </Form.Item>
    );
  },
);

const BasicFields = memo(() => {
  const { t } = useTranslate('setting');

  return (
    <>
      <Form.Item<FieldType>
        label={t('modelName')}
        name="llm_name"
        rules={[{ required: true, message: t('modelNameMessage') }]}
      >
        <Input placeholder={t('modelNameMessage')} />
      </Form.Item>
      <Form.Item<FieldType>
        label={t('addLlmBaseUrl')}
        name="api_base"
        rules={[{ required: true, message: t('baseUrlNameMessage') }]}
      >
        <Input placeholder={t('baseUrlNameMessage')} />
      </Form.Item>
      <Form.Item<FieldType>
        label={t('apiKey')}
        name="api_key"
        rules={[{ required: true, message: t('apiKeyMessage') }]}
      >
        <Input placeholder={t('apiKeyMessage')} />
      </Form.Item>
    </>
  );
});

const TokensInput = memo(() => {
  const { t } = useTranslate('setting');

  return (
    <Form.Item<FieldType>
      label={t('maxTokens')}
      name="max_tokens"
      rules={[
        { required: true, message: t('maxTokensMessage') },
        { type: 'number', message: t('maxTokensInvalidMessage') },
        {
          validator: (_, value) =>
            value >= 0
              ? Promise.resolve()
              : Promise.reject(new Error(t('maxTokensMinMessage'))),
        },
      ]}
    >
      <InputNumber placeholder={t('maxTokensTip')} style={{ width: '100%' }} />
    </Form.Item>
  );
});

const MaxTokensField = memo(() => {
  return (
    <Form.Item
      noStyle
      shouldUpdate={(prev, curr) => prev.model_type !== curr.model_type}
    >
      {({ getFieldValue }) => {
        const modelType = getFieldValue('model_type');
        return MODEL_CONFIG.maxTokenTypes.includes(modelType) ? (
          <TokensInput />
        ) : null;
      }}
    </Form.Item>
  );
});

const VisionField = memo(() => {
  const { t } = useTranslate('setting');

  return (
    <Form.Item
      noStyle
      shouldUpdate={(prev, curr) => prev.model_type !== curr.model_type}
    >
      {({ getFieldValue }) =>
        getFieldValue('model_type') === 'chat' ? (
          <Form.Item label={t('vision')} valuePropName="checked" name="vision">
            <Switch />
          </Form.Item>
        ) : null
      }
    </Form.Item>
  );
});

const GPUStackModalFooter = memo(
  ({
    originNode,
    llmFactory,
  }: {
    originNode: React.ReactNode;
    llmFactory: string;
  }) => {
    const { t } = useTranslate('setting');

    return (
      <Flex justify="space-between">
        <a href={MODEL_CONFIG.url} target="_blank" rel="noreferrer">
          {t('ollamaLink', { name: llmFactory })}
        </a>
        <Space>{originNode}</Space>
      </Flex>
    );
  },
);

const GPUStackForm = memo(
  ({
    form,
    onModelTypeChange,
  }: {
    form: FormInstance<FieldType>;
    onModelTypeChange: (value: ModelType) => void;
  }) => {
    return (
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          model_type: MODEL_CONFIG.defaultModelType,
          vision: false,
        }}
      >
        <ModelTypeField onChange={onModelTypeChange} />
        <BasicFields />
        <MaxTokensField />
        <VisionField />
      </Form>
    );
  },
);

const GPUStackModal: React.FC<
  IModalProps<IAddLlmRequestBody> & { llmFactory: string }
> = ({ visible, hideModal, onOk, loading, llmFactory }) => {
  const { t } = useTranslate('setting');
  const { form, handleModelTypeChange, handleSubmit } = useGPUStackForm(
    onOk,
    llmFactory,
  );

  return (
    <Modal
      title={t('addLlmTitle', { name: llmFactory })}
      open={visible}
      onOk={handleSubmit}
      onCancel={hideModal}
      okButtonProps={{ loading }}
      footer={(originNode) => (
        <GPUStackModalFooter originNode={originNode} llmFactory={llmFactory} />
      )}
    >
      <GPUStackForm form={form} onModelTypeChange={handleModelTypeChange} />
    </Modal>
  );
};

export default GPUStackModal;
