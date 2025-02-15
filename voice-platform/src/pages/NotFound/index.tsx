import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import styles from './styles.module.css';

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.notFound}>
      <Result
        status="404"
        title="404"
        subTitle="Sorry, the page you visited does not exist."
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            Back Home
          </Button>
        }
      />
    </div>
  );
}; 