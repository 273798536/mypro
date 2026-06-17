import { Breadcrumb } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface TraceBreadcrumbProps {
  items: BreadcrumbItem[];
}

const TraceBreadcrumb: React.FC<TraceBreadcrumbProps> = ({ items }) => {
  const breadcrumbItems = [
    {
      title: (
        <Link to="/">
          <HomeOutlined />
          <span style={{ marginLeft: 4 }}>看板</span>
        </Link>
      ),
    },
    ...items.map((item, index) => ({
      title: item.path ? (
        <Link to={item.path}>{item.label}</Link>
      ) : (
        <span style={{ color: 'rgba(255, 255, 255, 0.65)' }}>{item.label}</span>
      ),
    })),
  ];

  return (
    <Breadcrumb
      items={breadcrumbItems}
      style={{
        marginBottom: 16,
        fontSize: 14,
      }}
      separator=">"
    />
  );
};

export default TraceBreadcrumb;
