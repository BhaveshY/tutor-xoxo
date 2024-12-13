import { useNavigate as useReactNavigate } from 'react-router-dom';

export const useAppNavigate = () => {
  return useReactNavigate();
};

export const navigate = (path: string) => {
  // This is just a placeholder that will be replaced by the actual navigation
  // when useAppNavigate is called in a component
  console.warn('Navigation called outside React component context');
}; 