import React, { useState, useEffect } from 'react';

import DropDownItem from "../DropDownItem/DropDownItem";

import styles from "./DropDownContainer.module.scss";

interface Props {
  baseAPIUrl: string;
}

export interface ItemNode {
  parent: ItemNode | undefined;
  depth: number;
  index: number;
  url: string;
  valid: boolean;
  modified: boolean;
  children: Array<ItemNode> | undefined;
}

export const createNodeItem = (index: number, url: string, valid: boolean, depth: number, modified: boolean, parent: ItemNode | undefined): ItemNode => {
  return {
    parent: parent,
    depth: depth,
    index: index,
    url: url,
    valid: valid,
    modified: modified,
    children: undefined
  }
};

export const isNodeValid = (node: ItemNode): boolean => {
  return node.modified !== node.valid;
}

const DropDownContainer: React.FC<Props> = (props) => {
  const [listItemTree, setListItemTree] = useState<Array<ItemNode>>([]);
  const [changeCounter, setChangeCounter] = useState<number>(0);
  const [requestStatus, setRequestStatus] = useState<{ status: boolean, message: string } | undefined>(undefined);

  const fetchSequences = async () => {
    await fetch(props.baseAPIUrl).then((response) => {
      return response.json();
    }).then((json) => setListItemTree(json.map((e: any) => createNodeItem(e.index, props.baseAPIUrl, e.total === e.valid, 0, false, undefined))))
      .catch((error) => setRequestStatus({ status: false, message: "ERROR (fetch data): " + error }));
  }

  const resetList = () => {
    setListItemTree([]);
    setChangeCounter(0);
    fetchSequences();
    setRequestStatus(undefined);
  }

  const getChanges = () => {
    const requests: Array<{ url: string, valid: boolean }> = [];

    const checkForModification = (node: ItemNode, url: string) => {
      if ((node.modified && !node.children) || (node.modified && isNodeValid(node))) {
        requests.push({ url: url, valid: isNodeValid(node) });
      } else {
        if (node.children) {
          node.children.forEach(child => checkForModification(child, url + "/" + child.index));
        }
      }
    }

    listItemTree.forEach(child => checkForModification(child, "/" + child.index));

    return requests;
  }

  // Called when clicking on Confirm button
  const onConfirm = () => {
    const changes = getChanges();

    if (changes.length === 0) {
      return window.alert("There are no modifications!");
    }

    const userConfirm = window.confirm("Do you really want to modify " + changes.length + " elements?");

    console.log(changes, userConfirm);

    if (userConfirm) {

      fetch(props.baseAPIUrl.replace("validated", "validate"), {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        method: "POST",
        body: JSON.stringify(changes)
      }).then((response) => {
        if (response.ok) {
          resetList();
          setRequestStatus({ status: true, message: "Validation successful!" + response.status });
        } else {
          setRequestStatus({ status: false, message: "ERROR (request failed): " + response.status });
        }
      })
    }
  }

  const onReset = () => {
    const resetRecursive = (node: ItemNode) => {
      node.modified = false;

      if (node.children) node.children.forEach(child => resetRecursive(child));
    }

    listItemTree.forEach(child => resetRecursive(child));

    setChangeCounter(0);
  }

  // Fetch data on component mount
  useEffect(() => {
    fetchSequences();
  }, []);

  // Update list when changing between projects
  useEffect(() => {
    resetList();
  }, [props.baseAPIUrl]);


  return (
    <div className={styles.container}>

      {(listItemTree && listItemTree.length !== 0) ?
        listItemTree.map((node: ItemNode) => {
          return <DropDownItem key={`node-${node.depth}-${node.index}`} node={node} updateParent={undefined} updateChangeCounter={() => setChangeCounter(getChanges().length)} />
        }) :

        <h4>The project does not have any data yet...</h4>
      }

      {/* <div className={styles.floatLeft}>
          <div className={`${styles.square} ${styles.valid}`} />
          <div className={`${styles.square} ${styles.modified}`} />
          <div className={`${styles.square}`} />
          </div> */}

      <div className={styles.floatRight}>
        {changeCounter !== 0 &&
          <p className={styles.changes}>{changeCounter} changes</p>
        }
        <div className={`${styles.button} ${styles.confirm}`} onClick={onConfirm}>Confirm</div>
        <div className={`${styles.button} ${styles.reset}`} onClick={onReset}>Reset</div>
      </div>

      {requestStatus &&
        <p className={`${styles.requestStatus} ${requestStatus.status ? styles.success : styles.error}`}>{requestStatus.message}</p>
      }
    </div>
  );
}

export default DropDownContainer;
